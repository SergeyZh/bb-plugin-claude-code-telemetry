Inspect Claude usage inside a turn while keeping your existing Claude Code provider available.

## What you get

A separate **Claude Code Telemetry** entry in the provider picker. It reports input,
output, cache reads and cache writes for each observed main-agent request, with
message-ID deduplication. The final turn result adds only unreported usage.

## Requirements

Requires BB 0.48.1 or newer, Claude Code and a Claude account or API access.
Claude usage is subject to your account's plan and billing. This plugin uses
the existing native login. Its BB settings and provider identity are separate.

## Limits

Reports are buffered until the next request or turn completion. Subagent and
other unobserved usage remains an explicitly marked aggregate remainder.
Interrupted requests may have incomplete counts. Cache Watch support supplies
cost estimates and request breakdowns; it is a separate plugin.
