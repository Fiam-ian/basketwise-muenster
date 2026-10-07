# Pilot tooling verification

Status note (2026-10-07 WSL continuation): execution-limit and pending-check statements below describe the original session. Native tests, bounded browser checks, raw-audit inspection and public source release subsequently completed; see [current status](current-status.md), [WSL verification](wsl-verification.md) and [context reconciliation](context-reconciliation.md). Live walking, real product/pack eligibility and current-price coverage remain gated.

Recorded 2026-10-07. These checks supplement docs/verification.md; they do not replace a canonical Node test run.

## Checks completed

- Coverage summary: five authored test callbacks, containing 20 assertions, passed in the orchestration V8 runtime. Cases cover date windows, missing fields, duplicate observations and provenance counts.
- Europe/Berlin reference dates: four checks passed, including summer/winter midnight boundaries and daylight-saving transitions.
- Routing: 21 authored test callbacks passed in V8. Coverage includes coordinate validation, provider response structure, ordered waypoints, requested profile and units, snapping limits, geometry/summary distance consistency, and rejection before network calls for invalid settings. The transport used injected mocks.
- Audit CLI: equivalent cases passed in V8 with filesystem, path and provider stubs. Missing or invalid arguments, existing output and a parent path that is a file produce zero provider calls. A fresh nested output preserves request provenance; rerunning refuses to overwrite it. A simulated concurrent writer remains protected by exclusive creation. Five sequential Node subtests were authored; their real filesystem execution remains pending. The import-entrypoint guard was statically reviewed, not executed under Node here.

## Verification still required

Update: the user subsequently executed the complete suite in Windows Node and supplied its output: 71 tests passed, with zero failures or skips. This verifies actual Node execution and the CLI's temporary-file tests with mocked network calls. See node-verification.md for provenance and scope.

The assistant's terminal execution environment remains unavailable in this chat. No local HTTP server, real browser, live price-provider call or live routing-provider call has been verified. No public GitHub repository, push or CI run has been completed.

The original fictional comparison preview remains separate from the new audit and routing modules. Provider observation counts do not demonstrate matching shopping-list coverage. Routing responses retain unverified access-leg status and cannot establish compliance with a whole-trip walking budget.

After recovering local execution, run the full Node suite, rebuild the preview, inspect the actual browser flow, and perform the bounded price coverage audit before promoting any real price data. See windows-recovery.md and resume.md for the execution handoff.
