# Continue development in WSL

The Linux copy is now active at /home/chava/Projects/groceries-compare. Bash commands and native Node tests run successfully. No further migration is needed; scripts/migrate-to-wsl.sh correctly refuses an existing destination.

From the workspace root:

```bash
export PATH="$PWD/.tools/node-v22.23.3-linux-x64/bin:$PWD/.tools/gh/usr/bin:$PATH"
cd prototype
npm test
npm run dev
```

This project-local PATH avoids global installation. Read docs/current-status.md for the latest completed checks and outstanding work.

The private original-chat structured briefing is now copied into ignored local-data/brainstorm-transcript.md and reconciled. Read AGENTS.md and docs/context-reconciliation.md for lasting guidance; newer WSL code and evidence were preserved. The next slice is local requested-line product/pack eligibility diagnostics, with branch identity evidence recorded separately in docs/branch-evidence.md.

The source is published at https://github.com/Fiam-ian/basketwise-muenster and the first GitHub Actions test run passed. GitHub CLI is authenticated as Fiam-ian.

The release Git checkout is /tmp/basketwise-release.l01YFV; this working workspace was preserved. Future updates should use that checkout or a separate clone of the published repository. scripts/publish-wsl.sh --publish creates a new repository and must not be reused for ordinary updates to the existing repository. See docs/current-status.md for release evidence and outstanding data/routing work.
