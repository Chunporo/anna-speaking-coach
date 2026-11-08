"""Run migrations and regressions against an explicitly named test database."""

import argparse
import os
import runpy
import sys
import tempfile
import unittest
from pathlib import Path

import coverage
import dotenv
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=ROOT)
    args = parser.parse_args()
    database_url = os.environ.get("TEST_DATABASE_URL", "")
    if not database_url or not (make_url(database_url).database or "").endswith(
        "_test"
    ):
        parser.error(
            "TEST_DATABASE_URL must point to a dedicated database named *_test"
        )
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    # Do not load developer credentials or invoke live providers during tests.
    dotenv.load_dotenv = lambda *args, **kwargs: False
    os.environ.update(
        DATABASE_URL=database_url,
        ENVIRONMENT="development",
        PYTHONPATH=str(ROOT / "backend"),
        SECRET_KEY="isolated-regression-test-signing-key",
        CORS_ALLOW_ALL="false",
        ALLOWED_ORIGINS="http://localhost:3000",
        AUDIO_STORAGE="local",
        GOOGLE_CREDENTIALS_JSON="",
        GOOGLE_APPLICATION_CREDENTIALS="",
        GEMINI_API_KEY="",
        GOOGLE_CLIENT_ID="",
        GOOGLE_CLIENT_SECRET="",
    )
    sys.path.insert(0, str(ROOT / "backend"))
    os.chdir(ROOT)
    measured = coverage.Coverage(
        config_file=str(ROOT / ".coveragerc"), data_file=str(output / ".coverage")
    )
    measured.start()
    try:
        with tempfile.TemporaryDirectory(prefix="anna-regressions-") as runtime:
            os.chdir(runtime)
            for _ in range(2):
                sys.argv = ["init_db.py", "--seed-if-empty"]
                runpy.run_path(
                    str(ROOT / "backend/database/init_db.py"), run_name="__main__"
                )
            suite = unittest.defaultTestLoader.discover(str(ROOT / "backend/tests"))
            result = unittest.TextTestRunner(verbosity=2).run(suite)
    finally:
        os.chdir(ROOT)
        measured.stop()
        measured.save()
        measured.xml_report(outfile=str(output / "coverage.xml"))
        measured.json_report(outfile=str(output / "coverage.json"))
        measured.report()
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
