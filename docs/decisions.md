# Initial council decisions — 7 October 2026

## Authority and workflow

The product, data-provenance and architecture agents independently proposed
constraints and exchanged findings. The coordinator resolved the shared
contract before assigning separate implementation files. Advisory agents
review implementation in subsequent passes; implementation does not change
approved comparison invariants without a recorded decision.

Only material product-scope changes, recurring spending, privacy-model changes
or unresolved public ownership decisions require user input. Routine engineering
choices are delegated. No paid services are used.

## First slice

- Work in a new prototype/ subdirectory to preserve any existing workspace files.
- Use dependency-free browser ES modules, a local Node HTTP server and node:test.
- Default to the Münster city centre with fictional demonstration stores.
- Limit enumeration to one or two stores; calculate integer-cent whole-pack costs.
- Keep demo, advertised active offers and historical observations distinct.
- Only complete baskets receive a cheapest ranking.
- Keep savings and walking effort separate; no hidden monetary value for time.
- Label geometric distances explicitly. Verified pedestrian routes come later.
- Keep the first app local, without accounts or remote telemetry.
- Public GitHub release is authorised; original code uses MIT.

## Next gates

1. Execute Node tests and verify the app in a real browser when local runtime
   paths work. Fix any failures before claiming a tested app.
2. Verify Open Prices coverage in Münster, date quality and product matching.
3. Add reviewed branch metadata and an explicitly historical estimate mode.
4. Obtain a reliable source for more complete current shelf-price coverage.
5. Add a pedestrian routing provider with documented usage limits and attribution.
6. Publish the tested source to a new public GitHub repository; never publish
   third-party price proofs or personal information without appropriate scope.

## Historical Windows operational limits

The configured working directory uses /mnt/c/ paths while the desktop runtime
reports Windows paths. exec_command cannot start a shell and node_repl rejects
the sandbox working-directory URI. apply_patch can edit files. GitHub connector
authentication succeeds but its exposed tools do not include repository creation.
These are execution/capability limits, not requests for a new user permission.

## WSL reconciliation and next slice

The private original-chat briefing was reconciled with current work on 2026-10-07. Native WSL tests, bounded browser checks, retained-audit inspection and public GitHub source publication supersede the old operational limits above. See current-status.md and context-reconciliation.md. No optimizer invariant or public/private data boundary changed.

Persist Münster-first scope, separate checkout cost and walking effort, bounded council review with distinct ownership and newer-evidence precedence. The dependency-free stack is the first-slice implementation, not a permanent technology mandate.

Proceed to local historical product/pack eligibility diagnostics before enabling ranking. A reviewed public-address mapping for the single observed branch is recorded separately in branch-evidence.md. This does not supply reviewed product matches, current prices, stock, shop entrances or walking eligibility.
