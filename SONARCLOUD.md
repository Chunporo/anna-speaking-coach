# SonarCloud analysis

Project: https://sonarcloud.io/project/overview?id=Chunporo_anna-speaking-coach
Organization: chunporo

The repository uses standard SonarScanner analysis through `.github/workflows/ci.yml` and `sonar-project.properties`. This does not require Vortex. Vortex-based CLI analysis remains unavailable for the current connection.

## Configured

- The GitHub repository has an encrypted `SONAR_TOKEN` Actions secret. No token value is stored in the repository.
- The dedicated CI token expires on January 30, 2027. Rotate it before that date in SonarCloud account security, then update it with `gh secret set SONAR_TOKEN --repo Chunporo/anna-speaking-coach`.
- Automatic analysis was disabled on the SonarCloud project to avoid conflicts with CI-based scanning.
- The project uses the existing default Sonar way quality gate.
- The workflow runs on pushes to master, pull requests from the same repository, and manual dispatch. Fork pull requests skip the secret-backed job.
- The scan action is pinned to the verified v8 commit. Checkout includes full Git history.
- The scanner waits up to five minutes for the quality gate and fails the job if the gate fails.

## First run

Commit and push the workflow and properties file together with the code you want analyzed. Until those local files are pushed, GitHub cannot run this new workflow and automatic analysis is disabled.

For a new pull request, inspect the SonarCloud workflow in GitHub Actions. On master, once the workflow exists remotely, it can also be triggered with:

```sh
gh workflow run ci.yml --repo Chunporo/anna-speaking-coach --ref master
```

Only committed code is analyzed by GitHub Actions; local uncommitted repairs are not included. The existing cloud findings refer to the previous analyzed commit.

The backend job runs real migrations and regressions against a dedicated PostgreSQL database and generates `coverage.xml`. The frontend job executes TypeScript and React interaction tests with V8 coverage and generates `frontend/coverage/lcov.info`. Both jobs upload only their reports. The analysis job depends on both succeeding and downloads artifacts from the same workflow run before scanning; reports therefore describe the same commit as the analyzed code.

The existing 80% new-code coverage threshold remains unchanged. Unexecuted application files are included in coverage collection. Only test files and generated dependencies are omitted from Python coverage. The immutable SQL baseline is excluded from duplication checks because it intentionally snapshots the original schema.

To measure locally, use a dedicated database whose name ends in `_test`:

```sh
TEST_DATABASE_URL='postgresql:///anna_test' backend/.venv/bin/python backend/tests/run_coverage.py
cd frontend
npm ci --include=optional
npm run test:coverage
```

Use Node 22 for frontend checks. The backend runner disables developer dotenv files and live provider credentials, and uses an isolated directory for temporary audio files. It never resets a database automatically. Reports remain local build artifacts; a successful test run does not by itself establish that Sonar imported them or passed the quality gate.

## Troubleshooting

- Missing secret: update the repository's SONAR_TOKEN Actions secret.
- Unauthorized analysis: ensure the token owner has Execute Analysis permission on the project.
- Automatic-analysis conflict: check project Administration > Analysis Method and leave automatic analysis disabled while using CI.
- Red quality gate: inspect the failed conditions and resolve them; do not treat scanner authentication success as a passing quality gate.
- Vortex 403: use this CI workflow for standard analysis. Reinstalling the agent plugin will not grant Vortex entitlement.

Official setup: https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/github-actions-for-sonarcloud
