# Coverage and review follow-up

PR #1 was merged on 2026-11-03 at commit `3686941`. This follow-up implements
stages 3 and 4 on branch `codex/coverage-and-review`; AI integration remains deferred.

## Coverage

The backend runner applies migrations and runs regressions against an explicitly
named `*_test` PostgreSQL database. It disables developer dotenv files and live
provider credentials, and isolates temporary audio files. The frontend tests
execute real TypeScript/React modules with mocked network, browser, and provider
boundaries. Unexecuted application files remain in coverage collection.

Measured locally:

| Suite | Tests | Line coverage | Branch coverage |
| --- | --- | --- | --- |
| Backend | 58 passing | 94.83% | 86.21% |
| Frontend | 70 passing | 99.29% | 94.76% |

The frontend production build also passes on Node 22. Python XML and frontend LCOV
reports use repository-relative paths. CI uploads reports from the successful
test jobs and downloads them in the dependent Sonar job from the same workflow
run. The existing 80% new-code coverage threshold is unchanged. Cloud quality-gate
results must be checked on the follow-up PR's exact commit.

## Findings addressed

- Static question-audio serving now uses the same directory as TTS generation,
  including when the backend launcher changes its working directory.
- Nested Markdown headings no longer truncate recognized feedback sections.
- Rejected playback promises show an error and stop the playing indicator.
  Background fetch calls explicitly discard promises whose errors are handled.
- OAuth username collision suffixes use cryptographic randomness, and TTS cache
  identifiers use SHA-256.
- Backend images run as a nonroot user and copy only allowed application files.
  Python dependencies are transitively locked and hashed, installed as wheels.
  Clean image build, offline imports, dependency consistency, writable upload
  directories, and exclusion of credential/diagnostic files were verified.
- Compose uses a named upload volume initialized with the image's application
  ownership. Two separate container runs verify both write access and persisted
  recordings. This avoids the host bind-mount permissions regression introduced
  by switching the image to a nonroot user.
- Setup and container npm installs suppress lifecycle scripts and include the
  prebuilt optional native packages. Commit tooling does not download packages
  implicitly through npx.

The independent source review found no further confirmed critical or important
defects in ownership enforcement, progress transactions, private recording
persistence, or mock-test completion. New fixes have regression coverage.

### Existing Compose uploads

The old `./backend/uploads` directory is untouched. If it contains recordings,
copy them into the new named volume before starting the updated backend:

```sh
docker compose stop backend
docker compose build backend
docker compose run --rm --no-deps --user root --entrypoint sh -v "$PWD/backend/uploads:/legacy:ro" backend -c 'cp -an /legacy/. /app/uploads/ && chown -R app:app /app/uploads'
docker compose up -d backend
```

The copy preserves existing destination files and does not remove the source.
Fresh installations need no copy step. Keep the existing database volume.

## Remaining dependency risk

Compatible dependency patches reduced `npm audit --omit=dev` findings from eight
to two: Next.js is still reported critical and its nested PostCSS high. Resolving
the remaining advisories requires a major framework migration; the audit proposes
Next.js 16.4.5. Next.js was patched to 14.2.35 and Axios to 1.21.0 without silently
forcing that migration. Exploitability depends on platform and enabled features;
the audit is not evidence that an exploit succeeded.

Do not treat a passing Sonar source-code gate as approval for a production
release while these dependency advisories remain. Plan the major upgrade as a
separate compatibility-tested change. References:
[Next.js AVIF advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4),
[Next.js SVG advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw).

Live AI quality, physical microphone/device checks, and provider availability
are outside this review. No production merge or deployment is implied by it.
