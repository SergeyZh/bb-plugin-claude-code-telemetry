# Verification

Verified locally on 2026-11-01 with BB 0.48.1 and Plugin SDK 0.6.104.

- Typecheck: passed.
- Automated suite: 421 passed, 1 opt-in live test skipped.
- Upstream bridge conformance and calibration: passed within the suite.
- Public SDK import scan: passed; no private workspace dependencies.
- Live SDK smoke test: passed separately with Claude Haiku 4.5. It generated
  at least two requests using a fixed printf tool call. The cumulative input,
  output, cache read, and cache write counts exactly matched the final SDK result.
- Server and host artifacts: built successfully.
- Local installation: running as plugin/provider `claude-code-telemetry`.
- Live model discovery: 12 models returned.
- Built-in `provider-claude-code`: still enabled and running from its original
  application bundle directory. No original provider files or settings changed.
- Companion Cache Watch: typecheck and 70 tests passed, including per-request
  metadata, first cache read, Anthropic cost selection, and persistence on reload.
  Built and reloaded only that display plugin.

The live check used the SDK directly without creating a BB thread. A complete
live BB turn and browser interaction have not been exercised with this provider;
protocol, event assembly, registration, and model discovery were checked separately.

The repository is local. No GitHub repository has been created or published.

## Upstream sync, 2026-11-03

Imported the provider changes from upstream commits `9dec2ae`, `cdd1d66`, and
`51d8ddc`. Provider identity and the request telemetry collector are preserved.

- Typecheck: passed with the existing published SDK 0.6.104 dependency.
- Automated suite: 436 passed, 1 opt-in live SDK test skipped.
- Upstream regressions cover real Bash exit codes, description opt-in and
  changes between commands, missing fork sources, and worker memory exhaustion
  without terminating the caller.
- Server and host artifacts: built successfully.
- Built host smoke check: ran the actual `dist/host.js` in a fork worker against
  a temporary transcript; checkpoint fork succeeded, later messages were
  excluded, and stdout remained clean.
- Request telemetry regressions remain in the passing suite.

Upstream's command description field requires a BB host supporting SDK
0.6.117. That SDK version was not yet available on npm during verification;
the BB 0.48.1 / SDK 0.6.104 host ignores the field. Description tests verify
the emitted provider deltas, rather than claiming that the old assembler
preserves the new field. See UPSTREAM.md for the compatibility detail.

The initial sync verification did not reload the installed plugin or use live
Claude requests. The subsequent live check is recorded below.

## Live BB check after reload, 2026-11-03

Reloaded only `claude-code-telemetry` successfully on BB 0.48.1 / SDK 0.6.104.
Used Claude Haiku 4.5 through the installed provider in BB, not the SDK directly.

- Test thread `thr_fex2yxp9jr`: two completed turns. The first ran a fixed
  `printf`; the second recalled the first turn's marker and ran an intentional
  exit-23 command. BB persisted command exit codes 0 and 23 correctly.
- Event history contains four distinct main-agent request IDs and two marked
  aggregate remainders. Each usage report follows its telemetry metadata;
  counts match, request IDs are not duplicated, and report sums match the
  cumulative totals, including cache reads and writes.
- Fork `thr_cvuvpaciyu`: forked at the second turn's checkpoint, created a new
  native Claude session, and completed a live response recalling both the
  original marker and exit code 23 without tools.
- Both provider plugins remain running; telemetry plugin handler error count
  was zero after the check. The original provider was not reloaded.

Prompts, persisted event logs, and the checked summary are saved in the parent
BB thread's storage under `live-provider-check/`. Command-description display
remains unavailable on the old host as documented above.

## Upstream sync, 2026-11-05

Checked the official provider history after `51d8ddc` and imported all three
new provider commits through `6d5597d`:

- `d060de8`: report Max 20x as Ultra and normalize plan metadata.
- `5c5d3e5`: settle background tasks when the Claude SDK stream ends, including
  when an SDK process exits after the foreground turn has completed.
- `6d5597d`: update provider dependencies and their lockfile. Installed versions
  include Claude Agent SDK 0.3.318, MCP SDK 1.32.2, and Zod 4.6.7.

The provider changes from the background-task commit are included. Its core
runtime and daemon changes require updating BB itself. The standalone SDK pin
remains 0.6.104 for compatibility with the installed BB 0.48.1 host.

- Typecheck: passed.
- Automated suite: 438 passed, 1 opt-in live SDK test skipped. This includes
  the upstream SDK-stream termination regression and a Max 20x/Ultra check.
- Request telemetry regressions: passed; collector and its dedicated tests
  are unchanged by the sync.
- Server and host artifacts: built successfully.
- npm install audit: zero reported vulnerabilities.

This sync did not reload the installed plugin or make live Claude requests.

## Cache write lifetime metadata, 2026-11-05

Usage extension events now preserve the SDK's 5-minute and 1-hour write counts
as `cacheWriteBreakdown`, separately from standard BB token counters and TTL.
Missing and inconsistent splits remain explicitly unknown. Final aggregate
remainders subtract lifetime counts only when they can be attributed safely.

- Typecheck: passed.
- Automated suite: 446 passed, 1 opt-in live SDK test skipped.
- Regressions cover mixed write lifetimes, repeated blocks, missing and partial
  splits, inconsistent sums, explicit zero writes, aggregate subtraction,
  turn resets, interruptions, and backward-compatible metadata parsing.
- Metadata survives JSON serialization and the real delta assembler.

The Cache Watch cost calculation has not been changed to consume this field.
No live Claude requests were used, and the installed plugin was not reloaded
for this metadata change.

## Per-session cache TTL selection, 2026-11-05

Every discovered model and selected-only alias now declares the
`promptCacheTtl` select option: `auto`, `5m`, or `1h`. BB's existing model picker
renders it when creating a thread. Canonical session selections are validated
and forwarded as a session-scoped Claude SDK setting; no global plugin setting
or fabricated TTL telemetry is used. Changing the option restarts Claude before
the next turn with the same native conversation. Automatic removes the override.

- Typecheck: passed.
- Automated suite: 459 passed, 1 opt-in live SDK test skipped. Coverage includes
  model and alias declarations, invalid values, default versus omitted turn
  options, SDK launch settings, cold resume, fork, and changes back to Automatic.
- Server and host artifacts: built successfully.
- Reloaded `claude-code-telemetry` successfully on BB 0.48.1 / SDK 0.6.104.
- The live model catalog advertises all three choices for the discovered models.
- Browser check: opened the new-thread composer for this project, selected
  Claude Code Telemetry, and verified the Prompt cache TTL radio group. Selected
  5 minutes, 1 hour, then Automatic and verified each checked state. A screenshot
  is saved in the BB thread's storage at `session-ttl-check/new-thread-picker.jpg`.
  The browser session was closed without submitting a prompt or creating a thread.

No live Claude inference was used for this option change. The installed Claude
Code 2.1.318 supports the setting; it requires Claude Code 2.1.242 or later.

## Upstream sync, 2026-11-09

Imported all three provider changes after `6d5597d`, through `ac2829b`:

- `5538a27`: list native user skills only from the resolved Claude profile.
- `f51e6b0`: obtain account health and subscription limits from Claude Code,
  preserve profile-specific account UUIDs, and resolve relative fork config
  directories against the session working directory.
- `ac2829b`: opt into the host's experimental guided sign-in flow.

The provider identity, per-request usage extension, cache-write lifetime
breakdown, and per-thread prompt cache TTL remain specific to this fork.
The existing Ultra regression now uses Claude Code's reported account format.
The pinned BB SDK 0.6.104 is unchanged; the newer guided sign-in declaration
uses an object spread so it can be passed to supporting hosts with older types.

- Typecheck: passed.
- Automated suite: 462 passed, 1 opt-in live SDK test skipped (31 files passed,
  1 skipped), including account-profile, signed-out, plan-limit, session-fork,
  bridge conformance, request telemetry, and native-root coverage.
- Server and host artifacts: built successfully. BB reported the existing SDK
  pin differs from its SDK 0.6.132; no dependency update was made.
- Both source comparison patches were regenerated against `ac2829b` and
  verified by applying them to disposable upstream copies and checking their
  resulting contents.

No live Claude requests were made and the installed plugin was not reloaded.

## Upstream sync, 2026-11-10

Imported the sole provider change after `ac2829b` through
`0509f46aae61a5b30afac23551b084b0f28b6d4f` (2026-11-09): type-aware
promise linting. Compared all provider files from both exact commit archives;
only the package lint script changed. Upstream package version remains 0.1.0;
this release increments the fork to `0.1.0-telemetry.3+upstream.0509f46`.
The new source checksum was computed with the comparison generator's `digest()`
over every provider file from the target archive.

- Typecheck: passed (`npm run typecheck`, also run by the lint command).
- Type-aware lint: passed using the five upstream rules and locally installed
  Oxlint 1.93.0 / oxlint-tsgolint 7.0.2006. A temporary TypeScript probe with an
  unawaited typed `node:fs/promises` call failed with `no-floating-promises` as
  expected; the probe was removed before the final lint pass.
- Automated suite: 462 passed, 1 opt-in live SDK test skipped (31 files passed,
  1 skipped). Existing conformance, telemetry, cache-lifetime and TTL coverage
  remains in the suite; this import changes no runtime or test files.
- Server and host artifacts: built successfully. BB reported the existing SDK
  0.6.104 pin differs from its SDK 0.6.132; the pin was preserved.
- Both comparison patches regenerated against the exact target archive;
  generator `--check` verified patch application and every resulting file.
- `git diff --check`: passed.
- npm dependency audit: zero reported vulnerabilities. Only development lint
  dependencies were added; no runtime dependencies changed.

No new host or SDK requirement is introduced. Existing Bash-description and
guided sign-in host limitations remain documented in UPSTREAM.md. The lint
command runs typecheck first, replacing upstream's Turbo dependency, and uses a
local configuration instead of the monorepo root. Lint tooling requires Node
22.12 or newer on Node 22; verification used Node 24.17.0.

No live Claude requests were made, and the installed plugin was not reloaded.

## Steer and pooled model sync, 2026-11-10

Imported all provider changes after `0509f46` through
`8b232325543ae66d4374a71ee4d05838ad5cd793`, in commit order:
`bb8c2af` (keep queued steers in their accepted BB turn), then `8b23232`
(discover pooled account models with the request's environment). Both commits
are dated 2026-11-10. Exact archives were compared at baseline, intermediate,
and target; applying the ordered provider patches to the exact old provider
reproduced every target provider file. The generator's `digest()` over all
provider files in the exact target archive produced the pinned source checksum.

Upstream package version remains `0.1.0`; the fork revision increases once to
`0.1.0-telemetry.4+upstream.8b23232`. Both root lockfile versions agree.
Upstream's new bridge tests use this fork's `claude-code-telemetry` identity.
Existing telemetry, cache-write lifetime, TTL, and standalone packaging code
and regression coverage are retained.

- `npm run typecheck`: passed.
- `npm test`: 470 passed, 1 opt-in live SDK test skipped (32 files passed,
  1 skipped). Includes three steer-completion regressions, per-environment
  model discovery/memoization, paginated HTTP catalogs, effort mapping, alias
  retention, HTTP 404 fallback, and failures for empty catalogs and HTTP 503.
  Existing bridge conformance, request telemetry, cache-lifetime, and TTL tests
  remain in the passing suite.
- `npm run lint:type-aware`: passed, including its typecheck prerequisite.
- `npm run build`: passed for server and host artifacts. The existing SDK
  0.6.104 pin differs from this BB's SDK 0.6.132; the pin was preserved.
- Both comparison patches regenerated against the exact target archive;
  generator `--check` verified application and every resulting file.
- `git diff --check`: passed.

No new host protocol or SDK dependency is needed. SDK 0.6.104 already exports
`modelListParamsSchema` including `envVars`, and the installed Agent SDK types
support the imported code. The pooled catalog needs the external Account Pooler
route `/claude/v1/models` and `BB_CLAUDE_MODELS_URL` from upstream `8b23232`.
This integration imports the provider portion only. Missing URL/token and older
pools returning HTTP 404 retain CLI discovery. Steer tracking requires CLI
consumption reports for the new behavior; older CLIs without
`user_message_uuids` keep legacy turn completion. Existing Bash-description
and guided sign-in host limitations remain documented in UPSTREAM.md.

No live Claude requests were made, and the installed plugin was not reloaded.
No changes were pushed.

## Cache TTL price labels, 2026-11-10

Release `0.1.0-telemetry.5+upstream.8b23232` adds API cache write price
multipliers directly to the existing TTL labels: `5 minutes (write: 1.25× input)`
and `1 hour (write: 2× input)`. The option description identifies the input
token price as the reference. TTL values, defaults, and behavior are unchanged.
The multipliers and supported 5-minute/1-hour lifetimes were checked against
[Anthropic's prompt caching documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#pricing).

- `npm run typecheck`: passed.
- `npm test`: 470 passed, 1 opt-in live SDK test skipped.
- `npm run build`: passed for server and host artifacts; existing SDK pin retained.
- Installed source confirmed as this checkout, then only
  `claude-code-telemetry` reloaded. `bb plugin list --json` reports the new
  version, enabled, running, and zero handler errors.
- Comparison patches regenerated; generator `--check` and `git diff --check`
  passed.

No live Claude requests or browser UI checks were made for this label change.

## Compact cache TTL labels, 2026-11-10

Release `0.1.0-telemetry.6+upstream.8b23232` shortens the labels to
`5m · ×1.25` and `1h · ×2`, and the shared description to
`API cache writes: × input price.` This is a text-only change.

- Typecheck and server/host build: passed; existing SDK pin retained.
- Installed source confirmed as this checkout, then only
  `claude-code-telemetry` reloaded. Plugin inventory confirms the new version,
  enabled, running, and zero handler errors.
- Comparison patches regenerated; generator `--check` and `git diff --check`
  passed.

The earlier passing 470-test suite was not rerun for this text-only revision.
No live Claude requests or browser UI checks were made.

## Cache TTL button tooltips, 2026-11-10

Release `0.1.0-telemetry.7+upstream.8b23232` moves the price explanation from
the select option's shared description to each explicit TTL value's description:
`API cache writes: 1.25× input price.` and `API cache writes: 2× input price.`
The compact labels remain unchanged. BB's model picker source uses each item's
description for the button's native `title` tooltip; the shared select description
is not rendered there.

- Typecheck and server/host build: passed; existing SDK pin retained.
- Installed source confirmed as this checkout, then only
  `claude-code-telemetry` reloaded. Plugin inventory confirms the new version,
  enabled, running, and zero handler errors.
- Comparison patches regenerated; generator `--check` and `git diff --check`
  passed.

The earlier passing 470-test suite was not rerun for this text-only revision.
Tooltip wiring was checked in BB's local source, without a live browser check
or a Claude request.

## Cache tooltip hover activation, 2026-11-10

Release `0.1.0-telemetry.8+upstream.8b23232` replaces native browser tooltip
activation for the two explicit TTL price buttons with a small frontend content
script. Before the change, live DOM inspection and pointer events confirmed
that direct entry into `1h` reached the correct button with the correct title.
This alone did not validate native tooltip appearance; the reported difference
between direct entry and entry from `5m` is handled by removing that dependency.

The script listens for pointer entry and keyboard focus, displays an accessible
tooltip after 300 ms, suppresses the active native title to avoid duplicates,
and restores attributes when the hint closes. It only targets these two price
buttons in the Prompt cache TTL group. Escape, exit, scroll, resize, window blur,
menu removal, and plugin disposal clear pending/visible hints and restore the
original attributes. Positioning stays inside the viewport, with the hint above
the button when space allows. The frontend uses the existing SDK 0.6.104
content-script API; no SDK repin or runtime dependency was added. JSDOM 26.1.0
is a development dependency for DOM behavior/lifecycle regression coverage.

- Typecheck and type-aware lint: passed.
- `npm test`: 484 passed, 1 opt-in live SDK test skipped. Fourteen new DOM
  regressions cover direct entry with no previous hover, adjacent entry,
  pending-hint cancellation, repeated entry, child elements, focus/Escape,
  menu removal, abort/remount cleanup, scope, and viewport changes.
- Server, host, and new frontend artifacts built successfully. Installed source
  confirmed as this checkout, then only `claude-code-telemetry` reloaded.
  Plugin inventory reports the new version, enabled, running, zero handler
  errors, and a compatible frontend bundle using only `pluginSdkApp`.
- Live BB desktop browser check: actual pointer movement directly down into
  `1h` displayed the hour-price tooltip without visiting `5m`; captured and
  visually inspected the result. Moving horizontally from `5m` to `1h`
  correctly replaced the price hint. Leaving above and reentering `1h`
  again displayed the correct hint. No model prompt was sent or thread started.
- Both comparison patches regenerated; the production comparison now includes
  the new `app.ts` entry. Generator `--check` and `git diff --check`: passed.

## Release version, 2026-11-11

Raised the package version to `0.1.0-telemetry.9+upstream.8b23232` for the cache
price labels and reliable hover tooltips. Both root lockfile versions and the
README/versioning documentation agree. The upstream baseline is unchanged.

- `npm run build`: passed for server, host, and frontend artifacts.
- Asserted that the package, both lockfile versions, and all three artifact
  metadata versions equal the release version.
- Comparison patches regenerated; generator `--check` and `git diff --check`:
  passed.

No runtime code changed after the preceding successful typecheck, lint,
484-test suite, and live hover checks, so those checks were not repeated.
The installed plugin was not reloaded for this version-only step.
