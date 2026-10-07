# Verification record — 7 October 2026

## Checks executed

- Architecture agent: 29 optimizer and actual demo-fixture integration cases
  passed in the functions V8 environment. Test callbacks used the authored
  optimizer source, with module imports/exports replaced by supplied bindings.
- Coordinator: 8 provider callback tests passed in V8 with minimal URL,
  URLSearchParams and AbortController shims and an injected mock fetch.
- Product agent: 2 DOM-stub test groups passed against the authored app source.
  Scenarios include initial render, complete/single/partial separation, duplicate
  demands, quantities, membership, invalid input, unsafe source links, empty
  lists and denied local storage.

These are 39 passing test callbacks/groups, not a completed npm test run.
An additional V8 check compiled and ran the actual bundled preview with DOM
stubs and the real demo/optimizer/app combination. Four default catalogue
items produced three complete plans; adding 750 g pasta twice merged into
one 1500 g demand. This also remains a mocked-DOM check, not a browser test.
The UI groups each contain multiple interaction assertions. Mocked web APIs
and DOMs do not verify real browser behaviour, accessibility or visual layout.

The Node test files read/import the canonical modules and are ready to run:
tests/optimizer.test.mjs, tests/open-prices.test.mjs, tests/ui-smoke.test.mjs.

## Integration evidence

With all six fixture staples, a 3 km geometric radius and a 10 km geometric
round-trip budget: best single-shop checkout is 893 cents; the best two-shop
checkout is 816 cents, including 25 cents refundable deposit. Membership
opt-in changes that fixture result to 756 cents. These are fictional examples,
not Münster price observations or demonstrated real savings.

The missing-eggs shop stays incomplete; active-offer mode rejects all demo
offers. Frozen input data remains unchanged. The model purchases one product
and pack size per list item; mixing sizes is outside its scope.

## Not executed or established

- Node/npm test runner and local HTTP server execution.
- Real-browser interaction, layout, keyboard and assistive-technology checks.
- Live Open Prices requests, current Münster price coverage or real savings.
- Verified pedestrian routes, stock availability or retailer automation permission.
- Public GitHub repository creation, CI run or push.

## Operational evidence

File creation and updates succeeded using apply_patch. exec_command failed
to start any tested shell with a process-not-found error. node_repl rejected
the configured /mnt/c/ working-directory file URI. The desktop dependency
tool reported Windows runtime paths. Changing code cannot establish that this
host/session path mismatch has been fixed.

The connected GitHub account is Fiam-ian. Its exposed connector tools support
repository access and file/branch/PR operations but not creating repositories.
A guarded publish.ps1 is supplied for use with working local Node/git/gh tools;
it is not an executed publication.

## Remaining gate

Run npm test and check the app in a real browser after runtime access is
restored; review visual/interaction failures before calling the app tested.
Then validate real price coverage and publish the source. No additional
permission is being sought for the already-authorised public release.
