# Product automation — staged implementation

This repository uses event-driven quality checks, **not** daily QA. This is the first, read-only quality gate, intended to run on pull requests to `main` and by manual dispatch; it does not merge or deploy changes.

## Roles and gates

1. **Development complete** (Codex or another developer opens a PR): run deterministic static checks and focused regression tests. Stop on failure, send failures back to the developer; do not automatically edit their branch.
2. **PR ready**: review behavior and relevant graphics on phone-sized browser; attach evidence for changes to animation, 3D, controls or layout. A passing static gate alone is **not** approval.
3. **Release candidate**: run the full existing suite (`scripts/run-tests.sh -j 3`) in a sufficiently provisioned environment, plus story/fight smoke tests, save migration and offline update checks. Record results. This step is intentionally not in the fast gate because some tests are resource-intensive and GitHub-hosted runner minutes may be billable.
4. **Product review**: owner approves visual appearance and user experience. Unfinished Brick head and other isolated art stay excluded.
5. **Release**: authorized maintainer updates `main`, publishes, and verifies the served version, gameplay and rollback path. **No automated production publishing or auto-merge.**
6. **Post-release**: smoke test the live app and capture regressions in `docs/glory-of-the-ring/FEEDBACK_BACKLOG.md`.

## Current delivered gate

- `scripts/check_release_integrity.cjs`: verifies release number, changelog row, offline manifest/cache version consistency, and existence/safety of listed offline assets.
- `.github/workflows/release-quality-gate.yml`: PR-triggered fast check plus two existing focused Node regressions, with a five-minute job timeout. No external service, API key or paid model.
- Run locally with `node scripts/check_release_integrity.cjs`.

## Future automation (not yet implemented)

- PR-completion webhook or repository-event listener to assign QA only for completed work, not on a calendar.
- Focused test selection based on changed files.
- Headless 360/640 and 402/690 screenshots, RTL checks, performance budgets and before/after artifact comparison.
- Full regression execution on a suitable machine, with protected-branch merge gates if available.
- Release candidate staging, manual product approval, live browser smoke tests and rollback.

**Cost/safety:** GitHub-hosted Actions may consume metered runner minutes depending on repository/account settings. Use the repository's included quota or self-hosted capacity; the workflow is on a separate branch for review and does not deploy. Do not enable billable services without consent.
