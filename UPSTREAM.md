# Upstream

Forked from https://github.com/get-bb/bb/tree/916d684ac23d0b0de82c09cfc7553a50287d2188/plugins/provider-claude-code

MIT license, Copyright (c) 2026 Michael Yong. See LICENSE.

This standalone fork registers `claude-code-telemetry`; it never replaces `claude-code`.

Review the [source comparison patches](patches/README.md) for production-only
and full-source diffs against the latest imported upstream revision, including
instructions to reproduce and verify them.

## Versioning

The package version follows
`<upstream-provider-version>-telemetry.<revision>+upstream.<short-sha>`.
The current version is `0.1.0-telemetry.17+upstream.f7c4bde`:

- `0.1.0` is the upstream BB provider package version, not the Claude Code CLI
  or Agent SDK version.
- `telemetry.17` is this fork's release revision. Increment it for every release,
  including local fixes and upstream imports, even if upstream stays at `0.1.0`.
- `upstream.f7c4bde` identifies the latest fully imported upstream baseline.
  Use the first seven characters of its commit SHA; keep the full SHA and
  import date below and in the comparison-patch generator.

This is valid SemVer. Build metadata after `+` does not affect version ordering;
`telemetry.<revision>` determines the order of fork releases for the same base.
A local fix after this release would be
`0.1.0-telemetry.18+upstream.f7c4bde`. A later upstream import would increment the
revision again and replace the SHA with the newly imported baseline.

## Imported upstream fixes

Local release `telemetry.5` adds API cache write price multipliers to the
per-session TTL labels: 1.25× input for 5 minutes and 2× input for 1 hour.
The imported upstream baseline is unchanged.

Local release `telemetry.6` shortens those labels to `5m · ×1.25` and
`1h · ×2`, with the shared hint `API cache writes: × input price.`

Local release `telemetry.7` moves the price explanation to each TTL value's
description, which BB displays as a tooltip on the corresponding button.

Local release `telemetry.8` adds a frontend content script for the two cache
price hints. It renders accessible tooltips on direct hover or keyboard focus,
without depending on native browser title activation. The SDK pin is unchanged.

Local release `telemetry.9` packages the cache price labels and reliable hover
tooltips for commit; the imported upstream baseline remains unchanged.

Synced the provider changes through
[`8b23232`](https://github.com/get-bb/bb/commit/8b232325543ae66d4374a71ee4d05838ad5cd793)
on 2026-11-10, preserving this fork's identity and request telemetry:

- [`9dec2ae`](https://github.com/get-bb/bb/commit/9dec2aefb8852514942ffafc16a2316ae304de6e):
  stream transcript reads and writes when forking long sessions.
- [`cdd1d66`](https://github.com/get-bb/bb/commit/cdd1d666aaf6ad744a9788065154b41d27f914c0):
  fork sessions in a worker so an out-of-memory failure stays isolated.
- [`51d8ddc`](https://github.com/get-bb/bb/commit/51d8ddc75aa0ae68d8a87844fbf8938eeb2bf47d):
  emit Bash descriptions and preserve real command exit codes.
- [`d060de8`](https://github.com/get-bb/bb/commit/d060de8e30f3310417054a74510a774dd2909e2b):
  report Claude's Max 20x plan as Ultra and normalize plan metadata.
- [`5c5d3e5`](https://github.com/get-bb/bb/commit/5c5d3e52120e3b04c004e25bf03c8430ba851436):
  settle background tasks when the Claude SDK stream ends. This imports the
  provider changes; daemon and runtime changes belong to BB itself.
- [`6d5597d`](https://github.com/get-bb/bb/commit/6d5597d2851d4cef6d2fa22301d828daa6fbf319):
  update the Claude Agent SDK, MCP SDK, Zod, and relevant development
  dependencies. Standalone build tooling and the host-compatible BB SDK pin
  remain specific to this fork.

The description field was introduced with BB Plugin SDK 0.6.117, which was not
yet published to npm during the 2026-11-03 sync. This fork keeps its SDK 0.6.104
dependency to match the installed BB host and emits the upstream field on the
wire. Description regressions
therefore assert the outgoing deltas directly; the older SDK assembler drops
the field. Displaying descriptions requires a BB host that supports SDK
0.6.117's command description field. Exit codes and fork fixes work with the
existing host.

## Imported on 2026-11-09

- [`5538a27`](https://github.com/get-bb/bb/commit/5538a27bccb4): stop declaring
  the default home skill root alongside the roots resolved from
  `CLAUDE_CONFIG_DIR`, so BB lists only skills Claude Code can load.
- [`f51e6b0`](https://github.com/get-bb/bb/commit/f51e6b01420e9396e44575b09f8d78f3ba07f762):
  query Claude Code for its active account and plan limits instead of reading
  credentials or calling the OAuth usage endpoint directly. Health no longer
  marks refreshable tokens as expired. Account UUID lookup follows the selected
  profile, and fork resolves a relative `CLAUDE_CONFIG_DIR` against the session
  working directory. Keeps the fork's Ultra plan regression test using the
  account format returned by Claude Code.
- [`ac2829b`](https://github.com/get-bb/bb/commit/ac2829b9a66004c32d2f4b04e01b9176222b2af1):
  opt into BB's experimental guided sign-in flow. The flag is passed through
  with an object spread because the pinned SDK 0.6.104 predates it; older BB
  hosts ignore it. Display requires a BB host with the new setup experiment.

The Agent SDK dependency already supports the account and usage probes; no
package upgrades are needed. Probes start short-lived Claude Code processes
without sending a model prompt and close them after reading the result.

## Imported on 2026-11-10

- [`0509f46`](https://github.com/get-bb/bb/commit/0509f46aae61a5b30afac23551b084b0f28b6d4f)
  (2026-11-09): add type-aware promise linting. Comparing every provider file
  from the exact old and target archives confirms the only provider change is
  its `lint:type-aware` package script; no runtime changes or new tests occur.

The standalone command uses a local `.oxlintrc.type-aware.json` with all five
upstream rules: floating promises, misused promises, awaiting non-promises,
returns within error-handling scopes, and meaningless void operators. Monorepo
ignore paths are omitted. Oxlint and oxlint-tsgolint are development dependencies
instead of inherited workspace tooling. The command runs typecheck first to
preserve upstream's task dependency without Turbo or generated workspace types.
The lockfile resolves Oxlint 1.93.0 and oxlint-tsgolint 7.0.2006 within upstream's
requested ranges. Development linting requires Node 22.12 or newer on Node 22.

No new BB host, wire protocol, runtime dependency, or Plugin SDK requirement is
introduced. The standalone SDK remains pinned to 0.6.104; existing Bash
description and guided sign-in host limitations above still apply. Provider
identity, request telemetry, cache-write lifetime breakdown, per-thread TTL,
and regression coverage are preserved.

## Steer and pooled model sync, 2026-11-10

Imported both provider commits after `0509f46`, oldest first:

- [`bb8c2af`](https://github.com/get-bb/bb/commit/bb8c2afd784949990e24ce18bcf8b81478464f6a)
  (2026-11-10), "Keep a Claude Code turn open until the SDK has run every steer pushed into it (#7321)":
  track accepted prompt UUIDs and wait for queued steers before completing the
  BB turn. Older CLIs without consumption reports retain the previous completion
  behavior. Includes all three upstream bridge regressions.
- [`8b23232`](https://github.com/get-bb/bb/commit/8b232325543ae66d4374a71ee4d05838ad5cd793)
  (2026-11-10), "List pooled accounts' Claude models in the Claude Code picker (#7401)":
  use request environment variables for discovery, memoize per environment,
  and prefer the paginated account catalog while retaining available CLI aliases
  and descriptions. Includes upstream bridge, memo, and HTTP catalog regressions.

All provider files from the exact baseline, intermediate, and target archives
were compared. Applying the two ordered provider patches reproduces every file
in the target provider archive. Upstream package version remains `0.1.0`.

No new BB SDK or wire protocol is required: the pinned SDK 0.6.104 already
exports `modelListParamsSchema` with `envVars`. Runtime dependencies and the
standalone SDK pin are unchanged. Pooled catalog discovery requires Account
Pooler's new `/claude/v1/models` route and contributed `BB_CLAUDE_MODELS_URL`,
as implemented in upstream `8b23232`; those external plugin changes are not
part of this standalone provider. Without the URL/token, or on HTTP 404 from an
older pool, discovery keeps the CLI catalog. Other HTTP failures and empty
catalogs fail discovery rather than publishing a partial list. Steer tracking
uses CLI replay/result consumption reports when available and falls back to
legacy completion behavior when `user_message_uuids` is absent.

Provider identity, request telemetry, cache-write lifetime breakdown, per-thread
TTL selection, standalone packaging, and extra regression coverage are preserved.
Existing Bash-description and guided sign-in host limitations still apply.

## Task-notification steer sync, 2026-11-11

Synced all provider changes after `8b23232` through
[`4983aef`](https://github.com/get-bb/bb/commit/4983aef4b62468a719cbe1ccf344c26aeea883b8)
(2026-11-11), "Hold a steered Claude Code turn open through task-notification results (#7396)".
Non-human results no longer clear pending prompt bookkeeping. Once the CLI
has reported prompt consumption, a task-notification result keeps the BB turn
open until the queued steer runs. Older CLIs that never report consumption
retain legacy completion behavior. The upstream bridge regression is included.

Exact baseline and target archives differ only in the delta translator and
that bridge test; both provider changes are fully imported. Upstream package
version remains `0.1.0`; the fork revision increments once from 9 to 10.
The target source checksum covers every provider file using the comparison
generator's `digest()`.

No new host, SDK, wire protocol, or runtime dependency is required. The SDK
pin remains 0.6.104, and existing Bash-description, guided sign-in, and pooled
catalog compatibility limitations above still apply. The upstream limitation
where a failed turn with a pending steer can later finish as completed remains
unfixed by this change.

Provider identity, request telemetry, cache-write lifetime breakdown, per-thread
TTL selection and tooltips, standalone packaging, and fork regression tests
are preserved. No live requests, plugin reload, or push were performed.

## Session, permission, MCP probe, and skill sync, 2026-11-17

Imported all four provider commits after `4983aef` through
[`9a261b5`](https://github.com/get-bb/bb/commit/9a261b58e9e59f73701ff9f32ec90672901ce550),
oldest first (all dated 2026-11-16):

- [`399434f`](https://github.com/get-bb/bb/commit/399434ffe7c0c4b2c3fa48725086c4e1eb83d51a),
  "Claude Code: adopt a session id only after system/init announces the session (#7430)":
  gate bridge identity adoption, context probes, and SDK session ID capture on
  `system/init`, preserving the saved session after a startup failure.
- [`29c6888`](https://github.com/get-bb/bb/commit/29c688876af3f7a0ece75e509c0e02af3990a932),
  "Claude Code: never auto-deny a tool call with an empty message (#7424)":
  trim the hook reason and fall back to the policy message when it is blank.
  Existing transcripts containing empty error results are not repaired.
- [`583b443`](https://github.com/get-bb/bb/commit/583b44356b0576ce0ca5cbaf0842cdde573f627b),
  "Stop Claude metadata probes from connecting to user MCP servers (#7447)":
  restrict initialization/account/usage and context probes to explicit MCP
  servers, retaining the dynamic BB bridge for context accounting. When an
  enterprise `managed-mcp.json` exists, omit strict configuration because the
  CLI rejects that combination; enterprise policy retains MCP selection.
- [`9a261b5`](https://github.com/get-bb/bb/commit/9a261b58e9e59f73701ff9f32ec90672901ce550),
  "Claude Code: keep a mid-sentence skill's name when it is hoisted to a command (#7642)":
  keep an embedded or trailing skill name in the sentence while hoisting its
  slash command; a leading skill token is still removed.

Compared every provider file across the exact baseline, intermediate, and
target archives. Each ordered change matches its commit's provider file list;
all upstream regressions are included, with provider IDs adapted to this fork.
The target package version is `0.1.0`; this release increments the fork revision
once from 10 to 11. The full imported SHA is
`9a261b58e9e59f73701ff9f32ec90672901ce550`; the generator checksum covers every
provider file from its exact archive.

No new BB host, Plugin SDK, wire protocol, CLI upgrade, or runtime dependency
is required. The installed Agent SDK 0.3.318 already supports `strictMcpConfig`.
The BB SDK remains pinned to 0.6.104. Existing Bash-description, guided sign-in,
and pooled catalog requirements above still apply. MCP isolation deliberately
excludes user MCP tools from isolated context usage except under managed policy.

Provider identity, request telemetry, cache-write lifetime breakdown, per-thread
TTL selection and tooltips, standalone packaging, and fork regressions are
preserved. No live requests, plugin reload, automation creation, or push occurred.

## Account, unanswered interaction, withdrawal, text, and environment sync, 2026-11-19

Imported all five provider commits after `9a261b5`, oldest first, through
[`d9bcc98`](https://github.com/get-bb/bb/commit/d9bcc98cac2b924e4c667e435d721a602e63e4c4):

- [`a55b383`](https://github.com/get-bb/bb/commit/a55b383aeb92756b0a025db186ad5ac05c7ce68d)
  (2026-11-18), "Fix stale Claude plan badges after a Max-to-Pro downgrade (#7776)":
  prefer recognized Pro/Max organization metadata from the matching selected
  profile over stale first-party SDK plan metadata; preserve unknown plans,
  mismatched accounts, and the fork's Ultra regression.
- [`bc674ed`](https://github.com/get-bb/bb/commit/bc674ed48df7dda66ae80da60b147a9e77eb770f)
  (2026-11-18), "Never report a failure as the user's answer to an agent (#7723)":
  emit a provider warning and a precise non-user-answer denial for unshowable
  questions, runtime errors, unreadable resolutions, and unmappable answers.
  Policy auto-denials and stopped-turn teardown retain their existing behavior.
- [`6b779c8`](https://github.com/get-bb/bb/commit/6b779c869ba8b39b394faeabfb1473ba8cb34b6d)
  (2026-11-18), "Close approval cards the agent withdraws (#7797)":
  send `notifications/cancelled` when Claude aborts a permission/question request
  or its session closes, is replaced, or ends its stream. Includes the upstream
  permission and user-question withdrawal regressions.
- [`343b5e8`](https://github.com/get-bb/bb/commit/343b5e8321dbae2bf25b4928321fbef3954611c6)
  (2026-11-18), "Never cut text mid-emoji before agents or notifications (#7796)":
  use surrogate-safe cuts for command metadata and fallback question headers.
  The broader provider-boundary JSON serialization fix belongs to BB itself.
- [`d9bcc98`](https://github.com/get-bb/bb/commit/d9bcc98cac2b924e4c667e435d721a602e63e4c4)
  (2026-11-19), "Build every provider CLI's environment with one builder (#7722)":
  use one environment builder for sessions, catalogs, and maintenance, pass
  contributed environment through command discovery and its memoization key,
  and resolve skill configuration from the thread environment. Usage still
  receives the machine environment from the upstream host, rather than pooled
  routing credentials. Health also reads its profile from its explicit probe
  environment, correcting an upstream leftover `process.env` read.

Every provider file from all six exact archives was compared; the changed file
sets match each commit's provider file list. GitHub confirms baseline ancestry
and the complete provider history. Patches were applied in order without
replacing fork files. The target upstream package version is `0.1.0`; this
release increments the fork revision once from 11 to
`0.1.0-telemetry.12+upstream.d9bcc98`. The full imported baseline is
`d9bcc98cac2b924e4c667e435d721a602e63e4c4`. Its 97 provider files have generator
`digest()` SHA-256 `1b851551c3f0ca79affdbe919b1c19a64db7635361472921a188cd5b27130822`.

### SDK and host compatibility

The new upstream APIs require SDK 0.6.159 (unanswered interaction helpers),
0.6.161 (request cancellation and UTF-16 slicing), and 0.6.163 (CLI environment
builder and environment-aware maintenance helpers). On this import date npm
returned 404 for 0.6.163 and reported 0.6.157 as latest. The standalone SDK pin
remains 0.6.104; no dependency is silently repinned. Small helper backports from
the exact target live in `src/bridge/sdk-compat.ts`,
`src/bridge/maintenance-compat.ts`, and `src/utf16.ts`. They use existing public
SDK process primitives, environment filtering, version parsing, and types.
Optional `envVars` validation is added to sessionless request schemas while
accepting older requests without the field. No private workspace dependency
is introduced. The existing spawn helper already defaults `windowsHide` to
true, so removing the redundant option preserves its behavior.

Closing withdrawn approval cards requires the upstream #7797 runtime, daemon,
server, and projection changes: host-daemon protocol 269 or newer. This import
emits the cancellation notification; it does not update BB core. An older host
can still leave those cards pending. Forwarding contributed environment on
health, installation, and command-list requests requires upstream #7722 host
support (protocol 270 or newer). Older hosts remain accepted and fall back to
the bridge environment for absent request variables. Safe provider-boundary
JSON serialization from #7796 also requires its BB runtime update. The local
provider's surrogate-safe cuts do not depend on that update. Existing Bash
command-description, guided sign-in, and pooled catalog requirements above
still apply. No new Claude CLI or Agent SDK dependency is required.

Provider identity, request telemetry, cache-write lifetime breakdown, per-thread
TTL selection and tooltips, standalone packaging, and extra regressions are
preserved. No live requests, plugin reload, automation creation, push, or worker
agents were used.

## Blocking notice and HTTP error sync, 2026-11-21

Imported both provider commits after `d9bcc98`, oldest first, through
[`bce7015`](https://github.com/get-bb/bb/commit/bce7015f188b8b150a65abb9c3e9d31cb756f4d1):

- [`4d2cbc7`](https://github.com/get-bb/bb/commit/4d2cbc79d69e60b896b5a940b618e843283b1a57)
  (2026-11-20), "Render blocking Claude SDK notices as turn errors (#7896)":
  validate blocking informational notices, show their reason as a provider
  error, and fail the trailing result without duplicating the error or losing
  token accounting. Hook-block outcomes get their specific reason. A later
  accepted prompt resets the block; stale notices are suppressed and malformed
  or nonblocking notices remain diagnostics. All upstream regressions are kept.
- [`bce7015`](https://github.com/get-bb/bb/commit/bce7015f188b8b150a65abb9c3e9d31cb756f4d1)
  (2026-11-20), "Send plugin failures to the plugin's own log (#7875)":
  recognize branded `experimental_BbHttpError` host-not-found responses in
  usage discovery. The plugin's standalone adaptation retains its earlier
  unbranded `Error.status === 404` fallback for older hosts.

GitHub confirms baseline ancestry and the complete ordered provider history.
Every provider file from the exact baseline, intermediate, and target archives
was compared. Only the four notice files and two usage-source files changed;
ordered patches were adapted without replacing fork files. The target package
version remains `0.1.0`; the fork revision increments once from 12 to
`0.1.0-telemetry.13+upstream.bce7015`. The full baseline is
`bce7015f188b8b150a65abb9c3e9d31cb756f4d1`. Its 98 provider files have generator
`digest()` SHA-256 `a9009c7c22c072e6ecee32cd3b136ca8302477e0e06514d8395bd1033592869a`.

### SDK and host compatibility

The notice translation uses existing delta APIs and needs no new host, SDK,
Claude CLI, or Agent SDK dependency. The HTTP error API was introduced in
Plugin SDK 0.6.167; this fork keeps its 0.6.104 pin and backports the exact small
`BbHttpError` class from the target's `packages/sdk/src/http-error.ts` into
`src/http-error-compat.ts`, exporting the experimental alias locally. Its
`Symbol.for("@bb/sdk/http-error")` brand and `Symbol.hasInstance` recognize
errors from newer host SDK copies. The explicit legacy 404 fallback preserves
older-host behavior; unlike upstream's strict branded-only check, unbranded
`Error` instances carrying status 404 remain accepted. Tests cover both paths
and cross-copy branding. No dependency or minimum host requirement changed.

The broader #7875 failure logging and CLI envelopes are BB core changes,
not standalone provider code. Plugin-attributed failure logs require its
server/runtime update; forwarding host-worker stdout/stderr and exit reasons
also requires its matching daemon protocol 273 or newer. This import does not
provide those host behaviors on older BB installations. Existing withdrawal,
environment forwarding, JSON serialization, Bash-description, guided sign-in,
and pooled catalog limitations documented above remain in effect.

Provider identity, request telemetry, cache-write lifetime breakdown, per-thread
TTL selection and tooltips, standalone packaging, and extra regression tests
are preserved. No live requests, plugin reload, automation creation, push,
or additional worker agents were used.

## Per-session writable folder sync, 2026-11-22

Imported the only provider commit after `bce7015` through
[`796cdcc`](https://github.com/get-bb/bb/commit/796cdcc0f4bf8a55e23664035c54e8db6fe9d272)
(2026-11-22), "Decide agent writable folders per session; grant each thread only its own storage (#7994)".
Only existing directories are passed as Claude `additionalDirectories`
(`--add-dir`). Every supplied write root, including nonexistent lock-file
paths, remains in sandbox `filesystem.allowWrite`. Passing file roots through
`--add-dir` can prevent their sandbox write grant from taking effect.
The upstream bridge regressions now use real temporary directories and cover
start, resume, and permission updates; all fork regressions are retained.

GitHub confirms ancestry and exactly one newer provider commit through the
target. Comparing all 98 provider files from the exact baseline and target
archives finds only `session-options.ts` and `bridge.test.ts` changed. Both
patches were applied without replacing fork files. The target package version
is `0.1.0`; the fork revision increases once from 13 to
`0.1.0-telemetry.14+upstream.796cdcc`. The full imported baseline is
`796cdcc0f4bf8a55e23664035c54e8db6fe9d272`; the generator's source checksum is
`560ac0f1f9b7f455aabce8a17e2c83a2af36149e5c94a27b8f9e1087db87f124`.

### SDK and host compatibility

The provider filtering uses existing Node and Agent SDK APIs. No new Plugin
SDK, Claude CLI, Agent SDK, or dependency is required; the SDK stays pinned to
0.6.104. The upstream repository bumps SDK metadata to 0.6.179, but neither
changed provider file imports a new SDK API. The wire key
`providerOptions.additionalWorkspaceWriteRoots` is unchanged and already
accepted by this fork on session start, resume, turn start, and steer.

Per-session root calculation, granting only the thread's own storage, and
adding worktree `packed-refs`/lock roots require the matching BB server,
runtime, host-workspace, and daemon changes in #7994 (host-daemon protocol
>=277). An older host continues to supply its older root list; this provider
alone cannot isolate thread storage or add missing host roots. On macOS,
nonexistent lock-file grants are supported; upstream reports that Linux
sandboxes discard nonexistent writable paths, so the linked-worktree ref
cleanup fix remains limited there. The host implementation is outside this
standalone provider import. Existing compatibility limitations above remain.

Provider identity, request telemetry, cache-write lifetime breakdown, per-thread
TTL selection and tooltips, standalone packaging, and extra regression tests
are preserved. No live requests, reload, automation creation, worker agents,
or push were performed.

## Project and environment writable folder sync, 2026-11-24

Imported the only provider commit after `796cdcc` through
[`891ceb1`](https://github.com/get-bb/bb/commit/891ceb1bbfb28c36dd1fb51fbdaab800581c44d8)
(2026-11-23), "Add project folders and environment folders to the agent's writable workspace (#8007)".
When a workspace write root is removed, the provider rebuilds the resident
Claude session before its next turn, resuming the conversation with only the
remaining roots. Adding roots retains the live permission update behavior.
The upstream removal regression and its two existing test adjustments are
included alongside all fork tests.

GitHub confirms baseline ancestry and exactly one newer provider commit through
the target. Comparing all 98 provider files from both exact archives finds only
`bridge.ts` and `bridge.test.ts` changed. Both patches were applied to the fork
without replacing files. The target package version remains `0.1.0`; this
release increments the fork revision once from 14 to
`0.1.0-telemetry.15+upstream.891ceb1`. The full imported baseline is
`891ceb1bbfb28c36dd1fb51fbdaab800581c44d8`; its generator `digest()` checksum is
`bafa97c3a9b74f774cd7fa27a8f2769eb7f586ff425a7a245e949fdf4539c822`.

### SDK and host compatibility

Neither changed provider file uses a new SDK API. Plugin SDK 0.6.104, the
Claude Agent SDK dependency, and standalone packaging remain unchanged.
The provider continues consuming the existing
`providerOptions.additionalWorkspaceWriteRoots` field on turn start and steer.
Project folder management, environment-provider `additionalPaths`, and merging
those folders before each turn require the matching #8007 BB server, runtime,
host-workspace, and daemon changes (host-daemon protocol 278). The upstream
Plugin SDK 0.6.187 adds the environment-provider API; it is not required by this
agent provider's removal handling. Older hosts can still use that handling
when they supply a reduced root list, but this plugin alone cannot expose
project folder management or collect environment folders. Existing host and
Linux sandbox limitations documented above remain in effect.

Provider identity, request telemetry, cache-write lifetime breakdown, per-thread
TTL selection and tooltips, standalone packaging, and extra regressions are
preserved. No live requests, reload, automation creation, worker agents, or
push were performed.

## Image-read preview sync, 2026-11-25

Imported the only provider commit after `891ceb1` through
[`12eedb7`](https://github.com/get-bb/bb/commit/12eedb7562bd172fd69f86e25a28c1b6e456776d)
(2026-11-24), "Show image previews for ACP and Claude Code image reads (#8081)".
An absolute image-path `Read` is opened only after its result arrives and
settles once. Successful results containing an image block become `imageView`
without a presentation label; text-only results and failed reads remain
`fileRead`. Supported suffixes are png, jpg, jpeg, gif, webp, and bmp, ignoring
case. The four upstream result regressions are included unchanged.

GitHub confirms baseline ancestry and the complete provider history through
the target. Comparing every file from both exact archives finds only
`src/delta-translation.ts`, its tool-call test, and `src/schemas.ts` changed.
The import adapts the first import hunk around the fork's request telemetry;
no fork file is replaced. Upstream package version remains `0.1.0`; the fork
revision increments once from 15 to
`0.1.0-telemetry.16+upstream.12eedb7`. The full imported baseline is
`12eedb7562bd172fd69f86e25a28c1b6e456776d`. Its 98 provider files have generator
`digest()` SHA-256
`b92d107d2604374271a87e877fed73cf060d9158402796b0d9040236854cbce7`.

### SDK and host compatibility

The pinned SDK 0.6.104 already supports `imageView` and the existing delta
APIs. No new SDK API, Claude CLI, Agent SDK, or dependency is required. The
upstream SDK bump to 0.6.197 ships ACP-kit changes, outside this provider.
The provider emits a single unlabelled image view using existing APIs; matching
#8081 BB thread-view changes are required for consistent default titles and
Eye icons on older unlabelled image rows. This standalone import cannot update
that host rendering. ACP, Codex, and thread-view source changes remain outside
this package. Existing host compatibility limitations above still apply.

Provider identity, request telemetry, cache-write lifetime breakdown, per-thread
TTL selection and tooltips, standalone packaging, and extra regressions are
preserved. No live requests, reload, automation creation, worker agents, or
push were performed.

## Individual background task stop sync, 2026-11-26

Imported the only provider commit after `12eedb7` through
[`f7c4bde`](https://github.com/get-bb/bb/commit/f7c4bde6d0fd60dae653bb5323535c3b749bfced)
(2026-11-25), "Stop a single background command from the thread banner, CLI and SDK (#8158)".
Unsettled background tasks now advertise `stoppable: true`; settled tasks omit
that capability. The new `thread/backgroundTask/stop` request calls the resident
Claude session's `query.stopTask(familyId)` without interrupting or closing the
turn. Missing or closing sessions return a bridge error. Normal Claude task
notifications continue to settle tasks, including the existing stopped status.

GitHub history pinned to default-branch HEAD
`b0ddaad731565d7e4de68d824120d802fc78f7d5` confirms exactly this provider commit
in the interval, and compare confirms baseline ancestry. Comparing every file
from both exact provider archives finds only six changed files: the bridge,
commands, SDK session, task translator, and bridge/task translation tests.
All patches were applied to the fork without replacing files. Both upstream
regressions are included; capability assertions inspect outgoing deltas because
the pinned SDK's test assembler drops the new field. Additional regressions
cover a missing session and the backported request schema's required nonempty
references and passthrough fields.

The target upstream package version is `0.1.0`; the fork revision increases
once from 16 to `0.1.0-telemetry.17+upstream.f7c4bde`. The full imported baseline
is `f7c4bde6d0fd60dae653bb5323535c3b749bfced`. Its 98 provider files have generator
`digest()` SHA-256
`f80d8ce74b25e55dbf885d7841ef158110215c3e7bee907217424cb453df6d4c`.

### SDK and host compatibility

Upstream Plugin SDK 0.6.203 exports the new stop-request schema and capability
field. This fork deliberately retains SDK 0.6.104 and backports the exact small
passthrough request schema locally in `src/bridge/commands.ts`. The capability
is emitted directly on the wire through the existing delta sender. The installed
Claude Agent SDK 0.3.318 already supports `query.stopTask`; no dependency or CLI
upgrade is introduced by this provider patch.

Stopping tasks from the banner, CLI, or public SDK requires the matching #8158
BB runtime, server, daemon, API, and UI changes, with host-daemon protocol 285
or newer. Older hosts do not expose the stop path and may discard `stoppable`;
this standalone plugin cannot add those host features. Upstream timeline,
dangling-task reconciliation, and Codex changes are outside this package.
Existing compatibility limitations above remain in effect.

Provider identity, request telemetry, cache-write lifetime breakdown, per-thread
TTL selection and tooltips, standalone packaging, and extra regressions are
preserved. No live requests, plugin reload, automation creation, worker agents,
or push were performed.
