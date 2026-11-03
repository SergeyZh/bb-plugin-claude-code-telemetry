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
