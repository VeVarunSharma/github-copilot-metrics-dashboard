# Security prerelease checklist

Run this checklist before making Copilot Metrics Dashboard public.

- Run the secret sweep against the authoritative private Git remote/history, not only a local export or working copy. If this checkout is not a Git repository, clone the real remote and run the sweep there.
- Scan Git history with at least one dedicated tool:

  ```bash
  gitleaks detect --source . --redact
  trufflehog git file://. --only-verified
  ```

- Review and remediate all verified findings before publishing.
- Rotate any token, PAT, database credential, webhook secret, or cloud key that was ever committed, even if it was later removed.
- Confirm `.env` and local environment variants are gitignored and have never been committed.
- Verify GitHub secret scanning and push protection are enabled for `microsoft/github-copilot-metrics-dashboard`.
- Confirm public examples, logs, screenshots, issues, and fixtures use synthetic data only.
