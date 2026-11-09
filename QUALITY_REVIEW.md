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
run. The existing 80% new-code coverage threshold is unchanged. On commit
`dcb77b8`, GitHub Actions and SonarCloud passed: the new-code quality gate reports
95.0% coverage, 0% duplication, A ratings for reliability/security/maintainability,
and 100% reviewed security hotspots.

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

## Dependency security follow-up

The framework upgrade is included in this follow-up. Next.js is now 16.4.5 with
React 19.3.1; the unused React Query v3 package was removed. The mock-test page
uses the current route-parameter hook, TypeScript uses Next.js's bundler settings,
and the custom webpack alias was removed because the existing TypeScript path
mapping handles it. The frontend production build and all 70 tests pass.

ESLint now uses the Next.js flat configuration and runs in CI. Lint exits
successfully with 13 existing warnings about React Compiler recommendations and
hook dependencies; there are no lint errors. These warnings remain visible while
the app does not enable the React Compiler. The full `npm audit` currently reports
no vulnerabilities, including the development dependency tree. The production-only
audit is also clean.

This is dependency and build validation, not a live production deployment. Live
AI quality, physical microphone/device checks, and provider availability remain
outside this review. No production merge or deployment is implied by it.
