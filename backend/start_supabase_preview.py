"""Start a local Supabase-backed preview without saving or echoing credentials."""
import argparse
import getpass
import os
from pathlib import Path
import re
import secrets
import socket
import sys
import tempfile
import uuid

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

class SetupError(Exception):
    """An error message safe to show without credential-bearing diagnostics."""


def database_url(raw_uri, password, project_ref):
    try:
        url = make_url(raw_uri.strip())
        port = url.port
    except Exception:
        raise SetupError('Copy a PostgreSQL URI from Connect > Session pooler.') from None
    if (url.drivername not in {'postgres', 'postgresql', 'postgresql+psycopg2'}
            or not url.host or not url.host.endswith('.pooler.supabase.com')
            or port != 5432 or url.database != 'postgres'
            or url.username != 'postgres.' + project_ref):
        raise SetupError('Use this project\'s Session pooler URI on port 5432, as the postgres owner.')
    password = password or url.password
    if not password or 'YOUR-PASSWORD' in password.upper():
        raise SetupError('Enter your database password at the hidden password prompt.')
    return url.set(drivername='postgresql', password=password,
        query={'sslmode': 'require', 'connect_timeout': '10'}).render_as_string(hide_password=False)


def configure_environment(project_ref, uri, key, origin):
    if not re.fullmatch(r'[a-z0-9]{20}', project_ref):
        raise SetupError('The Supabase project reference must contain 20 lowercase letters or digits.')
    if not key or key.startswith('sb_publishable_'):
        raise SetupError('Use a backend secret key or legacy service_role key, not a publishable key.')
    from urllib.parse import urlsplit
    parsed = urlsplit(origin)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.path or parsed.query or parsed.fragment):
        raise SetupError('The preview origin must be an HTTPS origin without a path.')
    # Disable dotenv before importing any application or migration modules.
    # Credentials stay in this process and are never written to a .env file.
    import dotenv
    dotenv.load_dotenv = lambda *args, **kwargs: False
    os.environ.update(DATABASE_URL=uri, AUDIO_STORAGE='supabase',
        SUPABASE_URL=f'https://{project_ref}.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY=key, SUPABASE_AUDIO_BUCKET='recordings',
        ENVIRONMENT='production', CORS_ALLOW_ALL='false', ALLOWED_ORIGINS=origin,
        SECRET_KEY=secrets.token_hex(48))


def check_database(uri):
    engine = create_engine(uri)
    try:
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
    except Exception:
        raise SetupError('Database connection failed. Check the session pooler URI, password, and project status.') from None
    finally:
        engine.dispose()


def check_storage():
    from app.services import audio_storage
    from app.utils.uploads import MAX_BYTES
    try:
        with audio_storage._client() as client:
            result = client.get('bucket/recordings')
            if result.status_code == 404:
                result = client.post('bucket', json={'id': 'recordings', 'name': 'recordings',
                    'public': False, 'file_size_limit': MAX_BYTES})
                if not result.is_success:
                    raise SetupError('Could not create the private recordings bucket. Check the server key.')
                result = client.get('bucket/recordings')
            metadata = result.json() if result.is_success else None
            if not isinstance(metadata, dict) or metadata.get('public') is not False:
                raise SetupError('The recordings bucket must exist and be private. Check the server key and bucket settings.')
        # Verify the real object lifecycle, independently of speech providers.
        with tempfile.TemporaryDirectory(prefix='anna-storage-check-') as directory:
            path = Path(directory) / (uuid.uuid4().hex + '.wav')
            import wave
            with wave.open(str(path), 'wb') as audio:
                audio.setnchannels(1)
                audio.setsampwidth(2)
                audio.setframerate(16000)
                audio.writeframes(b'\0\0' * 160)
            audio_storage.persist_recording(path)
            try:
                response = audio_storage.recording_response(path.name)
                if response.body != path.read_bytes():
                    raise SetupError('The private recording download did not match the upload.')
            finally:
                audio_storage.delete_recording_file(path.name)
    except SetupError:
        raise
    except Exception:
        raise SetupError('Private storage verification failed. Check the server key and bucket permissions.') from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-ref', required=True)
    parser.add_argument('--origin', default='https://anna-speaking-coach-preview-chunporo.vercel.app')
    parser.add_argument('--port', type=int, default=8014)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        raise SetupError('Choose a local port between 1024 and 65535.')
    with socket.socket() as probe:
        try:
            probe.bind(('127.0.0.1', args.port))
        except OSError:
            raise SetupError('The preview port is already in use. Stop its previous process or choose another port.') from None
    if not sys.stdin.isatty():
        raise SetupError('Run this command in your own interactive terminal for hidden credential input.')
    print('Credentials are hidden and kept only in this process. Do not paste them in chat.')
    raw_uri = getpass.getpass('Supabase Session pooler URI (hidden): ')
    password = getpass.getpass('Database password (hidden; Enter if already present in URI): ')
    key = getpass.getpass('Supabase secret/service_role key (hidden): ').strip()
    uri = database_url(raw_uri, password, args.project_ref)
    configure_environment(args.project_ref, uri, key, args.origin)
    check_database(uri)
    print('Database connection passed.')
    check_storage()
    print('Private recording upload, download, and deletion passed.')
    from database.init_db import init_database
    try:
        init_database(seed_if_empty=True)
    except Exception:
        raise SetupError('Database initialization failed. Check the project owner connection and migration status.') from None
    print('Database migrations and question seeds are ready.')
    # Use an isolated working directory for ephemeral transcription/TTS files.
    with tempfile.TemporaryDirectory(prefix='anna-supabase-preview-') as runtime:
        os.chdir(runtime)
        from app.main import app
        import uvicorn
        print(f'Supabase preview ready on http://127.0.0.1:{args.port}. Keep this terminal open.')
        uvicorn.run(app, host='127.0.0.1', port=args.port)


if __name__ == '__main__':
    try:
        main()
    except SetupError as error:
        print(f'Setup stopped: {error}', file=sys.stderr)
        raise SystemExit(1) from None
    except (KeyboardInterrupt, EOFError):
        print('\nPreview stopped.')
