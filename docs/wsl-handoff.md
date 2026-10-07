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

For the authorized release, authenticate GitHub CLI locally as Fiam-ian, then run:

```bash
gh auth login
bash scripts/publish-wsl.sh --check
bash scripts/publish-wsl.sh --publish
```

The publisher retains its allowlisted snapshot in a temporary checkout and preserves this development workspace. Authentication is currently missing; no public repository or push was completed.
