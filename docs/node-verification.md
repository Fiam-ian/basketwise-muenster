# Windows Node test run

Status note (2026-10-07 WSL continuation): execution-limit and pending-check statements below describe the original session. Native tests, bounded browser checks, raw-audit inspection and public source release subsequently completed; see [current status](current-status.md), [WSL verification](wsl-verification.md) and [context reconciliation](context-reconciliation.md). Live walking, real product/pack eligibility and current-price coverage remain gated.

Reference date: 2026-10-07 (Europe/Berlin).

The user executed the following in Windows PowerShell from the prototype directory and pasted the complete terminal output into this chat:

```powershell
Set-Location -LiteralPath 'C:\Users\dhuma\Documents\ChatGPT\Groceries Compare\prototype'
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test
```

Reported result: 71 tests, 71 passed, zero failed, cancelled, skipped or todo. Reported duration: 455.1402 ms. This is a real Node test run performed by the user, rather than the earlier orchestration V8 checks. The assistant did not independently execute the command.

The run covers the audit CLI's real temporary-file operations with mocked fetch, coverage summaries, the price adapter with mocked provider responses, demo integration, pack/deposit and basket calculations, routing validation with injected transport, and UI smoke tests using DOM stubs.

This supersedes earlier statements that a canonical Node suite had not run. Live price coverage, real walking-provider responses, browser rendering and interaction, GitHub publication and CI remain unverified. These passing tests do not establish current shelf prices, stock availability, complete priced baskets in Münster or real-world walking distances.

The assistant's execution tooling remains unable to start a process despite the user's working PowerShell/Node execution. See runtime-blocker.md for the separate tool failures.
