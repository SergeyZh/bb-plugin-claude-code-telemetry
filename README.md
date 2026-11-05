# Claude Code Telemetry for BB

A standalone fork of BB's Claude Code provider, installed alongside it.

- Plugin and provider ID: `claude-code-telemetry`
- Picker name: **Claude Code Telemetry**
- Original provider: `claude-code`, unchanged

## Install locally

```sh
npm ci --include=dev
npm run typecheck
npm test
bb plugin build
bb plugin install .
```

Select Claude Code Telemetry when creating a new thread. Existing Claude Code
threads keep their provider. Settings are separate (`bb plugin config
claude-code-telemetry`); the native Claude login and CLI remain shared.
Disabling this plugin does not disable the built-in provider.

## Upstream fixes

Session forks stream transcript reads and writes and run in a worker, isolating
out-of-memory failures. Failed Bash commands retain their reported exit code.
Background tasks settle when the Claude SDK stream ends. Usage and account
metadata report the Max 20x tier as Ultra.

The `commandDescriptionsEnabled` setting defaults to `false`. Enable it to
include Claude's short Bash descriptions in command events. Displaying these
descriptions requires a BB host with Plugin SDK 0.6.117 support; older hosts,
including the verified BB 0.48.1 / SDK 0.6.104 host, ignore the new field.
Approval prompts and expanded command details keep the original command.

## Telemetry

Each main-agent SDK message ID yields one standard
`thread/tokenUsage/updated` report containing uncached input, output, cache read,
and cache write counts. Repeated content blocks update a buffered snapshot;
they never count as additional requests. The snapshot is published when the
next distinct message arrives or the turn ends. Session totals remain cumulative.

The preceding `thread/extensionState/updated` event, kind
`claude-code-telemetry/usage`, records `source`, `messageId`, `model`, `counts`,
and `incomplete`. These events are persisted by BB and available through its
SDK and `bb thread log <id> --json`. The latest extension state is only a snapshot;
read the event history for all requests.

The final SDK result contributes only positive counts that have not already
been observed. This `aggregate-remainder` is combined usage, potentially from
subagents, compaction, or messages with no stable ID. It does not claim to be
one request. Missing optional aggregate cache counts remain unknown. On process
interruption, the last buffered snapshot is marked incomplete; unreported tokens
cannot be recovered. Cumulative totals restart with a new bridge session, as in
the built-in provider.

The companion Cache Watch integration recognizes this provider, uses Anthropic
rates, preserves request steps, and exposes the first request's cache reads
when a complete request report is available. Costs remain API-equivalent
estimates, not subscription charges. Per-subagent request costs and mixed-model
cost attribution are not implemented.

## Development

`npm test` includes the upstream bridge conformance suite and recorded transcript
checks, plus request accounting regressions. See UPSTREAM.md and LICENSE for
provenance. No private BB workspace packages are required.

An opt-in live SDK smoke test makes two or more requests on your Claude account
and checks that their sum exactly matches the SDK result. It creates no BB
thread, disables persistence, and uses only a fixed Bash printf check:

```sh
CLAUDE_TELEMETRY_LIVE=1 npm test -- src/live-smoke.test.ts
```
