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
