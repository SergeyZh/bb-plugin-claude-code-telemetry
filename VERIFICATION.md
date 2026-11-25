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

## Task-notification steer sync, 2026-11-11

Imported all provider changes after `8b232325543ae66d4374a71ee4d05838ad5cd793`
through `4983aef4b62468a719cbe1ccf344c26aeea883b8` (2026-11-11),
"Hold a steered Claude Code turn open through task-notification results (#7396)".
The baseline is an ancestor of the target. Compared every provider file in
both exact archives: only `src/delta-translation.ts` and the bridge regression
file changed. Their upstream patches were applied without replacing fork files.
The source checksum uses the generator's `digest()` over all target provider
files. Upstream package version is `0.1.0`; the fork revision increases once
from 9 to `0.1.0-telemetry.10+upstream.4983aef`.

- The new upstream regression failed before the runtime fix, reproducing the
  premature turn completion, and passes in the full suite after the fix.
- `npm run typecheck`: passed.
- `npm test`: 485 passed, 1 opt-in live SDK test skipped (33 files passed,
  1 skipped). Includes the imported task-notification regression and retained
  bridge, telemetry, cache-lifetime, TTL, and tooltip coverage.
- `npm run lint:type-aware`: passed, including its typecheck prerequisite.
- `npm run build`: passed for server, host, and frontend artifacts on BB 0.49.0.
  The existing SDK 0.6.104 pin differs from the host SDK 0.6.132; it is retained.
- Package version, both root lockfile versions, and all three artifact
  `pluginVersion` fields agree; artifact provider identity is unchanged.
- Both comparison patches regenerated against the exact target archive;
  generator `--check` verifies application and every resulting file.
- `git diff --check`: passed.

No new host, SDK, wire protocol, or runtime dependency is required. The new
behavior depends on CLI prompt-consumption reports; CLIs that never report
`user_message_uuids` retain legacy completion behavior. Existing host limitations
for Bash descriptions and guided sign-in and external pooled catalog requirements
remain as documented in UPSTREAM.md. Upstream's separate failed-turn-with-pending-
steer limitation remains: such a turn can later finish as completed.

No live Claude requests were made. The installed plugin was not reloaded,
no automation was created, and no changes were pushed.

## Session, permission, MCP probe, and skill sync, 2026-11-17

Imported `399434f`, `29c6888`, `583b443`, and `9a261b5`, oldest first, through
`9a261b58e9e59f73701ff9f32ec90672901ce550`. Initial checkout was clean at the
pinned `9abaf58c3badd95337c8733d30bc11aeedbb87a1`, with the expected imported
baseline `4983aef4b62468a719cbe1ccf344c26aeea883b8`. GitHub confirms baseline
ancestry and the complete ordered provider history through the target.

Every provider file from all five exact archives was compared; each change
matches the corresponding commit's provider file list. Patches were applied
in order with the test provider ID adapted to `claude-code-telemetry`, without
replacing fork files. Upstream package version remains `0.1.0`; the release is
`0.1.0-telemetry.11+upstream.9a261b5`. The source checksum uses the comparison
generator's `digest()` over every target provider file.

- `npm run typecheck`: passed.
- `npm test`: 491 passed, 1 opt-in live SDK test skipped (34 files passed,
  1 skipped). Includes startup-failure identity, empty hook-denial reason,
  three MCP isolation/managed-policy cases, and embedded/trailing skill
  regressions. Existing telemetry, cache-lifetime, TTL, tooltip, and bridge
  coverage is retained.
- `npm run lint:type-aware`: passed, including its typecheck prerequisite.
- `npm run build`: passed for server, host, and frontend artifacts on BB 0.49.0.
  The existing SDK 0.6.104 pin differs from the host SDK 0.6.132; it is retained.
- Package version, both root lockfile versions, and all three artifact
  `pluginVersion` fields agree; artifact plugin identity is unchanged.
- Both comparison patches regenerated against the exact target archive;
  generator `--check` verifies patch application and every resulting file.
- `git diff --check`: passed.

No new host, SDK, wire protocol, CLI upgrade, or dependency is required.
Agent SDK 0.3.318 supports strict MCP configuration. Enterprise managed MCP
configuration retains policy-selected servers, since the CLI rejects combining
it with strict MCP configuration. Existing host and pooled catalog limitations
remain documented in UPSTREAM.md. This change prevents new empty denial
messages but does not repair previously damaged transcripts.

No live Claude requests were made. The installed plugin was not reloaded,
no automation was created, and no changes were pushed.

## Account, unanswered interaction, withdrawal, text, and environment sync, 2026-11-19

Imported `a55b383`, `bc674ed`, `6b779c8`, `343b5e8`, and `d9bcc98`, oldest
first, through `d9bcc98cac2b924e4c667e435d721a602e63e4c4`. Before editing, the
checkout was clean at the dispatched HEAD
`da6d3c6ef4bcd7a599f452e200468903c1fd54e1`, and `UPSTREAM_COMMIT` matched
`9a261b58e9e59f73701ff9f32ec90672901ce550`. GitHub confirmed ancestry and the
complete ordered provider history. Every provider file from all six exact
archives was compared; changed file sets match each commit's provider file
list. All ordered provider patches applied without replacing fork files.

The target package version remains `0.1.0`; the release increments the fork
revision once to `0.1.0-telemetry.12+upstream.d9bcc98`. The pinned checksum is
the generator's `digest()` over all 97 provider files from the exact target
archive. README and plugin overview baseline links are updated.

- `npm run typecheck`: passed.
- `npm test`: 511 passed, 1 opt-in live SDK test skipped (35 files passed,
  1 skipped). The upstream account downgrade, failure-denial, withdrawal,
  and environment-aware command memoization regressions are included.
  Additional standalone coverage checks inherited/contributed env filtering,
  Windows case-insensitive overrides (simulated), optional sessionless env
  validation, actual child-process env and PATH/version probes, profile/email
  attribution and Ultra preservation, warning deltas for failed questions,
  and emoji boundaries in command metadata and fallback question headers.
  Existing bridge conformance, telemetry, cache-lifetime, TTL, tooltip, and
  public SDK import coverage remains in the passing suite.
- `npm run lint:type-aware`: passed, including its typecheck prerequisite.
- `npm run build`: passed for server, host, and frontend artifacts on BB 0.49.0.
  Build reports SDK pin 0.6.104 versus host SDK 0.6.132; the pin is retained.
- Package version, both root lockfile versions, and all three artifact
  `pluginVersion` fields agree. Every artifact retains plugin identity
  `claude-code-telemetry`.
- Both source comparison patches regenerated against the exact target archive;
  generator `--check` verifies application and every resulting file.
- `git diff --check`: passed.

SDK 0.6.163 is not published to npm on this import date (version lookup returns
404; latest is 0.6.157). Instead of repinning to unavailable or host-incompatible
SDK APIs, the required small upstream helpers are backported with existing
public SDK process primitives. The profile read in health also follows its
explicit env rather than the upstream leftover `process.env`. No runtime or
development dependencies changed.

Provider-side import is complete. Host-side approval withdrawal needs upstream
#7797 runtime/daemon/server/projection support (host-daemon protocol >=269).
Contributed env on sessionless health/installation/command discovery needs
upstream #7722 host support (protocol >=270). Older requests are accepted;
older hosts cannot supply those new host-side behaviors. Upstream #7796's
provider-boundary JSON serialization also requires its BB runtime update.
The local safe cuts work independently. Existing Bash-description, guided
sign-in, and pooled catalog requirements remain documented in UPSTREAM.md.
No live Windows console validation was performed; only its environment merge
branch was simulated in automated tests.

No live Claude requests were made. The installed plugin was not reloaded,
no automation or worker agent was created, and no changes were pushed.

The staged diff check additionally caught a trailing blank line in each of two
new helper files (untracked files were absent from the earlier working-tree
diff check). The initial integration commit had already been created because
the shell sequence did not stop on that check's failure. Both blank lines were
removed, patches regenerated, and the staged diff and patch checks rerun before
a separate correction commit, without amending history or bumping the release
again. This correction changes only whitespace and these verification notes;
the passing runtime checks above remain applicable.

## Blocking notice and HTTP error sync, 2026-11-21

Before editing, the checkout was clean at dispatched HEAD
`359f1244cea52284b968fe88648e0629b7fe7b30`, and `UPSTREAM_COMMIT` matched
`d9bcc98cac2b924e4c667e435d721a602e63e4c4`. GitHub confirms ancestry and exactly
the dispatched two provider commits through the target. Compared every
provider file from all three exact archives and applied `4d2cbc7` followed by
`bce7015`, adapting the HTTP error import to the standalone compatibility file.
No fork files were replaced wholesale. The target upstream package version is
`0.1.0`; the release increments once to
`0.1.0-telemetry.13+upstream.bce7015`. Baseline links, full imported SHA, and
source checksum over all 98 target provider files are updated.

- `npm run typecheck`: passed.
- `npm run lint:type-aware`: passed, including its typecheck prerequisite.
- `npm test`: 523 passed, 1 opt-in live SDK test skipped (37 files passed,
  1 skipped). Includes the unchanged upstream blocking-notice regressions,
  branded and legacy missing-host usage paths, cross-copy HTTP error branding,
  error metadata, and retained bridge, telemetry, cache-lifetime, TTL, tooltip,
  SDK compatibility, and public SDK import coverage.
- `npm run build`: passed for server, host, and frontend artifacts. Build
  reports SDK pin 0.6.104 versus the installed host's SDK 0.6.157; the pin is
  deliberately retained. No dependencies were changed or repinned.
- Package version, both root lockfile versions, and all three artifact
  `pluginVersion` fields agree. Artifact plugin IDs remain
  `claude-code-telemetry`.
- Both comparison patches regenerated against the exact target archive;
  generator `--check` verifies application and every resulting file.
- Working-tree and staged `git diff --check`: passed.

The exact target HTTP error class is backported with its global symbol brand
rather than requiring SDK 0.6.167. Newer hosts' branded errors are recognized;
older hosts retain the prior unbranded `Error.status === 404` fallback. This
compatibility deviation from upstream's strict check is deliberate and tested.
The blocking-notice fix uses existing host delta APIs. Broader #7875 failure
logs and CLI envelopes require the BB core update; host-worker log forwarding
also requires matching daemon protocol >=273. Those core changes are outside
this provider import. Existing host limitations remain in UPSTREAM.md.

No live Claude requests, live host-log validation, plugin reload, automation
creation, additional worker agents, or push occurred. The opt-in live SDK test
was not enabled. The local integration commit uses per-command disabled
signing, without changing persistent Git settings.

## Per-session writable folder sync, 2026-11-22

Before editing, the checkout was clean at dispatched HEAD
`1c9429cbaee549653717673e331be1077db8d3e4`, and `UPSTREAM_COMMIT` matched
`bce7015f188b8b150a65abb9c3e9d31cb756f4d1`. GitHub history pinned to the
resolved default-branch HEAD contains exactly the dispatched provider commit
through `796cdcc0f4bf8a55e23664035c54e8db6fe9d272`; the compare API confirms
baseline ancestry. Comparing all 98 provider files from both exact archives
finds only the session-options implementation and bridge tests changed.
Both provider changes are imported, retaining the fork additions. The target
package version is `0.1.0`; the fork revision increases once from 13 to
`0.1.0-telemetry.14+upstream.796cdcc`. Baseline links, import notes, and the
source checksum using the generator's `digest()` are updated.

Initial typecheck, tests, and lint failed because ambiguous upstream test hunks
placed temporary-directory setup and cleanup in neighboring fork tests.
Those hunks were moved to the matching start/resume root tests, and all checks
below were rerun successfully after that correction.

- `npm run typecheck`: passed.
- `npm test`: 523 passed, 1 opt-in live SDK test skipped (37 files passed,
  1 skipped). Includes all updated upstream bridge regressions using existing
  temporary directories, the nonexistent lock-file root exclusion from
  `additionalDirectories` while retained in sandbox `allowWrite`, and existing
  start/resume/permission-update coverage. Fork telemetry, cache-lifetime,
  TTL, tooltips, bridge conformance, and SDK compatibility tests are retained.
- `npm run lint:type-aware`: passed, including its typecheck prerequisite.
- `npm run build`: passed for server, host, and frontend artifacts. The build
  reports the existing SDK pin 0.6.104 versus host SDK 0.6.157; no dependencies
  were repinned. The change uses no new SDK APIs.
- Package version and both root lockfile versions agree. All three generated
  artifact metadata files have that version and ID `claude-code-telemetry`.
- Both comparison patches regenerated against the exact target provider
  archive; generator `--check` verifies application and every resulting file.
- Working-tree and staged `git diff --check`: passed.

The provider-side target is fully imported. BB core's per-thread storage
isolation, per-session write roots, and linked-worktree packed-ref grants
require the matching #7994 server/runtime/host-workspace/daemon update
(host-daemon protocol >=277). Older hosts keep supplying their old roots.
The existing provider wire key is unchanged. Upstream SDK metadata 0.6.179
is not a new requirement for these two provider files. Linux sandboxes discard
nonexistent write paths, so upstream's lock-file ref-cleanup fix remains
limited there; macOS supports these file grants. Existing host limitations
remain documented in UPSTREAM.md.

No live Claude requests, sandbox validation on macOS or Linux, plugin reload,
automation creation, worker agents, or push occurred. The live SDK test was
not enabled. The local integration commit uses per-command disabled signing,
without changing persistent Git settings.

## Project and environment writable folder sync, 2026-11-24

Imported the complete provider change after `796cdcc` through
`891ceb1bbfb28c36dd1fb51fbdaab800581c44d8` (#8007). GitHub history contains
exactly one provider commit in this interval, and compare confirms baseline
ancestry. All 98 provider files from the exact baseline and target archives
were compared: only `bridge.ts` and `bridge.test.ts` changed. The ordered patch
was applied to the fork, preserving its telemetry and other additions.
The target upstream version is `0.1.0`; the fork revision increases once from
14 to `0.1.0-telemetry.15+upstream.891ceb1`. The exact source checksum,
baseline links, and import notes are updated.

- `npm run typecheck`: passed.
- `npm test`: 524 passed, 1 opt-in live SDK test skipped (37 files passed,
  1 skipped). Includes the upstream writable-folder removal regression and
  adjusted context-probe and additive permission-update assertions. Existing
  fork telemetry, cache lifetime, TTL, tooltips, conformance, and compatibility
  coverage remains in the suite.
- `npm run lint:type-aware`: passed, including its typecheck prerequisite.
- `npm run build`: passed for server, host, and frontend artifacts using
  BB 0.50.1. The existing SDK-pin warning reports plugin SDK 0.6.104 versus
  host SDK 0.6.157. No dependencies were repinned.
- Package version and both root lockfile versions agree. All three generated
  artifact metadata files contain that version and `claude-code-telemetry` ID.
- Both comparison patches regenerated against the exact target provider
  archive. Generator `--check` verifies patch freshness, application, and every
  resulting file; working-tree and staged `git diff --check` passed.

The provider-side target is fully imported. Removing a workspace write root
marks the resident session for reconstruction before the next turn; adding
roots retains live permission updates. No new SDK API, Claude CLI, or Agent
SDK dependency is required. Project folder management, environment-provider
`additionalPaths`, and merging those roots before each turn require the
matching #8007 BB core changes and host-daemon protocol 278. Upstream SDK
0.6.187's environment-provider API is not an agent-provider requirement.
Older hosts must supply a reduced root list to trigger removal handling;
this standalone plugin cannot add the BB folder-management features itself.
Existing host and Linux sandbox limitations remain in UPSTREAM.md.

No live Claude requests, live sandbox checks, plugin reload, automation
creation, additional worker agents, or push occurred. The live SDK test was
not enabled. The integration commit uses per-command disabled signing without
changing persistent Git settings.

## Image-read preview sync, 2026-11-25

Before editing, the checkout was clean at dispatched HEAD
`477cdd34e048ee91ad8194609f8ab56ee0f46f9d`, and `UPSTREAM_COMMIT` matched
`891ceb1bbfb28c36dd1fb51fbdaab800581c44d8`. GitHub confirms baseline ancestry
and exactly one provider commit through target
`12eedb7562bd172fd69f86e25a28c1b6e456776d` (#8081). The history query was pinned
to default-branch HEAD `fb045a046653cc127656ca3c7243d44ae4c94f3f`.
Comparing all 98 provider files from both exact archives finds only the delta
translator, its tool-call test, and schemas changed. The first import hunk was
adapted around the fork's request telemetry import; no fork file was replaced.
The target upstream package version remains `0.1.0`; the fork revision increases
once from 15 to `0.1.0-telemetry.16+upstream.12eedb7`. Both root lockfile versions,
baseline links, and the generator's exact source checksum are updated.

- `npm run typecheck`: passed with the pinned SDK 0.6.104.
- `npm test`: 528 passed, 1 opt-in live SDK test skipped (37 files passed,
  1 skipped). Includes all four upstream image-read regressions: image-only,
  mixed image/text, text at an image path, and a failed image read. Each asserts
  deferred opening and exactly one start/completion pair; image views have no
  presentation label. Existing fork telemetry, cache lifetime, TTL, tooltips,
  conformance, and compatibility tests remain in the passing suite.
- `npm run lint:type-aware`: passed, including its typecheck prerequisite.
- `npm run build`: passed for server, host, and frontend on BB 0.50.1. The build
  warns that the plugin pins SDK 0.6.104 while the host uses SDK 0.6.157; no
  dependency was repinned. All three artifact metadata files retain the correct
  provider identity and agree with the package and lockfile version.
- Both comparison patches regenerated against the exact target archive;
  generator `--check` verifies freshness, application, and every resulting file.
- Working-tree and staged `git diff --check`: passed.

The complete provider-side change uses existing `imageView` and delta APIs;
upstream SDK 0.6.197 ships ACP-kit changes and is not required here. Successful
absolute image-path reads with an image content block settle once as an
unlabelled `imageView`. Failed and text-only reads remain `fileRead`. No pending
image row is shown while the tool runs. Consistent default titles and Eye icons
for unlabelled image views require the matching #8081 BB thread-view update;
this standalone plugin cannot supply that host rendering update. ACP and Codex
changes are outside this package. Existing host limitations remain documented
in UPSTREAM.md.

No live Claude requests, live preview rendering checks, plugin reload,
automation creation, additional worker agents, or push occurred. The opt-in
live SDK test was not enabled. The local integration commit uses per-command
disabled signing without changing persistent Git settings.
