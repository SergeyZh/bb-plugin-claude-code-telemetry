# Claude Code Telemetry for BB

A standalone fork of BB's Claude Code provider, installed alongside it.

- Plugin and provider ID: `claude-code-telemetry`
- Picker name: **Claude Code Telemetry**
- Original provider: `claude-code`, unchanged

## Differences from the built-in provider

Choose this provider when you want more detailed usage records or a cache TTL
choice for each thread. It uses the same Claude Code runtime and native login
as the built-in provider. It adds a separate picker entry and plugin settings;
existing threads keep their provider, and the built-in provider stays available.

This comparison is against the original provider at
[`6d5597d` (2026-11-05)](https://github.com/get-bb/bb/tree/6d5597d2851d4cef6d2fa22301d828daa6fbf319/plugins/provider-claude-code),
the latest upstream provider revision imported into this fork.

| Capability | Original provider at this revision | Claude Code Telemetry |
| --- | --- | --- |
| Usage reporting | Final aggregate for each turn | Observed main-agent requests, deduplicated by message ID, plus an explicitly marked aggregate remainder |
| Request details | No per-request telemetry extension | Message ID, reported model, token counts, source, and completeness in saved BB events |
| Cache writes by lifetime | Combined cache-write count and a single TTL hint | Separate 5-minute, 1-hour, and unknown-lifetime write counts when available |
| TTL choice in BB | No per-thread TTL selector | Automatic, 5 minutes, or 1 hour in the new-thread model picker, also available through SDK and CLI |

The lifetime selector configures future Claude requests. Usage reports describe
what the SDK actually observed; selecting a TTL does not fabricate cache hits,
write counts, or a cache expiry time.

## Source comparison patches

The repository includes reviewable patches against the upstream revision linked
above. They already include the imported upstream fixes in their base, so the
diff shows this fork's own changes:

- [telemetry-runtime.patch](patches/telemetry-runtime.patch) contains the working
  TypeScript changes: request telemetry, write-lifetime counters, per-session
  TTL selection, and the standalone provider identity.
- [upstream-to-telemetry.patch](patches/upstream-to-telemetry.patch) also includes
  tests, documentation, standalone build configuration, and the lockfile.

Patch paths are relative to `plugins/provider-claude-code`. The full comparison
excludes `patches/` itself, generated bundles, dependencies, and Git metadata.
See [patch instructions](patches/README.md) for the exact base, source snapshot
checksum, application commands, and regeneration. Update the artifacts after
source changes with `python3 scripts/update-upstream-patches.py`; use `--check`
to verify they are current. Generation applies both patches to disposable
upstream copies and verifies that the resulting source files match this fork.

## Limitations and compatibility

- **SDK-visible usage, not every network request.** Individual reports require
  a stable main-agent message ID and complete token/cache counters. Subagents,
  compaction, and other unobserved usage may appear only as a combined
  `aggregate-remainder`. Its model and individual request costs may be unknown.
- **Reports are delayed.** A request is buffered until the next distinct
  message or turn completion. An interrupted process can leave partial counts;
  the last observed request is marked incomplete. Unobserved usage cannot be
  recovered by this plugin.
- **Historical detail is limited.** New metadata does not reconstruct request
  or cache-lifetime details missing from older events. Provider cumulative
  counters restart with a new bridge session; already saved BB events remain
  available for consumers to aggregate.
- **Detailed display is separate.** The plugin has no statistics window of its
  own. Records are available through BB events, SDK, and CLI. Cache Watch is a
  separate plugin for displaying usage and API-equivalent cost estimates.
- **Cost is an estimate, not a bill.** API estimates do not measure subscription
  charges or remaining plan allowance. Missing usage or model attribution can
  make a full-turn estimate unavailable. The current Cache Watch calculation
  does not yet consume this fork's new write-lifetime breakdown, so its price
  range can remain even when those counts are saved.
- **TTL selection covers the main conversation.** Only Automatic, 5 minutes,
  and 1 hour are offered; subagents retain their separate policy. Claude Code's
  TTL environment overrides can take precedence. Changes apply on the next
  turn by restarting Claude with the same conversation.
- **TTL does not confirm a live cache.** The reported value is a single hint;
  mixed lifetimes can coexist, and model or prompt-prefix changes can prevent
  reuse. A selected or reported one-hour TTL does not prove that the entire
  conversation will be reusable for an hour.
- **Compatibility depends on the host.** Requires BB 0.48.1 or newer with a
  compatible Plugin SDK and a working Claude login or API access. The TTL
  selector requires Claude Code 2.1.242 or later. Displaying imported Bash
  descriptions requires BB support for SDK 0.6.117's description field; BB
  0.48.1 / SDK 0.6.104 ignores that field.
- **Upstream maintenance is manual.** This is a standalone fork.
  Updating the built-in provider does not update this plugin. Fixes to BB's
  core or daemon require updating BB itself. The tested versions and live-check
  scope are recorded in [VERIFICATION.md](VERIFICATION.md); provenance and the
  imported upstream commits are in [UPSTREAM.md](UPSTREAM.md).

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

## Session cache lifetime

When creating a Claude Code Telemetry thread, open the model picker and choose
**Prompt cache TTL**: **Automatic**, **5 minutes**, or **1 hour**.
The choice belongs to that thread, not to the provider's global settings.
Automatic leaves Claude Code's existing configuration and defaults in effect.
One-hour cache writes cost more than five-minute writes.

The same option is available through the SDK's `sessionOptions.promptCacheTtl`
and the CLI:

```sh
bb thread spawn --provider claude-code-telemetry --option promptCacheTtl=1h --prompt "Your task"
bb thread options <thread-id> --set promptCacheTtl=5m
```

Selections survive resume and fork. Changing the option on an existing thread
restarts its Claude process before the next turn, preserving the conversation;
choosing Automatic removes this plugin's override. This setting controls the
main conversation, not the separate subagent cache TTL. Claude Code 2.1.242 or
later is required. Claude Code's TTL environment overrides, including
`FORCE_PROMPT_CACHING_5M`, retain their documented precedence.

The selected lifetime is a request setting, not evidence that a cache exists.
Observed TTL and write-lifetime counts continue to come from usage telemetry.

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

New usage metadata also records `cacheWriteBreakdown`:
`fiveMinuteTokens`, `oneHourTokens`, and `unknownTokens`. These are token counts,
not TTL estimates. A lifetime counter is `null` when unreported; unknown writes
remain in `unknownTokens`. An explicit zero total write count gives zero for
both lifetimes. The entire breakdown is `null` when the total write count is
unknown; older events may omit the field altogether.

Repeated blocks of a request do not add the counters twice. Aggregate remainder
breakdowns subtract observed lifetime counts only when the subtraction is
unambiguous; interruptions keep observed counts with `incomplete=true`.
Existing BB token counters are unchanged. Cache Watch must consume this new
metadata before it can replace its 5m–1h write-price range with exact lifetime
pricing. Historical events without the breakdown cannot recover it from TTL.

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
cost attribution are unavailable for aggregate usage without sufficient model
information; consumers can price observed requests using their reported model.

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
