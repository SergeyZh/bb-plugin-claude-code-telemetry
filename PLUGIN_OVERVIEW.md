Inspect Claude usage per observed request and choose a cache lifetime for each
thread. This experimental fork installs alongside BB's built-in Claude Code
provider and uses the same native login and CLI.

## Differences from the built-in provider

Compared with the original provider at
[ac2829b (2026-11-06)](https://github.com/get-bb/bb/tree/ac2829b9a66004c32d2f4b04e01b9176222b2af1/plugins/provider-claude-code):

- Usage is reported for observed main-agent requests, with message-ID
  deduplication, instead of only a final turn aggregate. Unobserved usage is
  added as a separately marked aggregate remainder.
- Saved BB events include the request ID, reported model, token counts, source,
  and completeness. Cache writes include separate 5-minute, 1-hour, and unknown
  lifetime counts when the SDK supplies them.
- The new-thread model picker offers Prompt cache TTL: Automatic, 5 minutes,
  or 1 hour, with API cache write prices of 1.25× and 2× the input token price.
  A small frontend content script displays the two price hints on direct hover
  or keyboard focus, independent of native browser title activation.
  The choice is per thread, survives resume and fork, and is also
  available through SDK and CLI.
- A separate Claude Code Telemetry picker entry and settings keep the built-in
  provider available. Existing threads keep their provider; settings are
  separate, while the native Claude login and CLI are shared.

## Limitations

- Not every network request is visible individually. Reports need a stable
  main-agent message ID and complete token/cache counters. Subagents,
  compaction, and other hidden usage may appear only as a combined remainder
  that cannot be reliably split by request or model.
- Reports are buffered until the next request or turn completion. Interruptions
  can leave incomplete counts; usage not observed before the interruption
  cannot be recovered. Older events do not gain missing historical detail.
- There is no statistics window in this plugin. Data is available through BB
  events, SDK, and CLI. Cache Watch is a separate display plugin; its costs are
  API-equivalent estimates, not subscription charges or remaining allowance.
  Missing model attribution can make a full-turn cost unavailable. Its current
  calculation does not yet use the new lifetime breakdown, so a price range
  can remain.
- TTL selection controls the main conversation, not subagents. Claude Code's
  TTL environment overrides can take precedence. Changing the selection
  restarts Claude before the next turn while preserving the conversation.
- Selected TTL and reported TTL do not confirm that a live cache exists.
  Mixed lifetimes, model changes, or prompt-prefix changes can limit reuse.
- Provider cumulative counters restart with a new bridge session; saved BB
  events remain available. Upstream fixes are imported manually, and BB core
  or daemon fixes require updating BB itself.

## Requirements

BB 0.48.1 or newer, a compatible Plugin SDK, Claude Code, and a working Claude
account or API access. TTL selection requires Claude Code 2.1.242 or later.
Displaying imported Bash descriptions needs BB support for SDK 0.6.117's
description field; BB 0.48.1 / SDK 0.6.104 ignores it. Claude usage remains
subject to the account's plan and billing.
