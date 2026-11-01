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
