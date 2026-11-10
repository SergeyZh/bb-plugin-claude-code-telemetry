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
The current version is `0.1.0-telemetry.4+upstream.8b23232`:

- `0.1.0` is the upstream BB provider package version, not the Claude Code CLI
  or Agent SDK version.
- `telemetry.4` is this fork's release revision. Increment it for every release,
  including local fixes and upstream imports, even if upstream stays at `0.1.0`.
- `upstream.8b23232` identifies the latest fully imported upstream baseline.
  Use the first seven characters of its commit SHA; keep the full SHA and
  import date below and in the comparison-patch generator.

This is valid SemVer. Build metadata after `+` does not affect version ordering;
`telemetry.<revision>` determines the order of fork releases for the same base.
A local fix after this release would be
`0.1.0-telemetry.5+upstream.8b23232`. A later upstream import would increment the
revision again and replace the SHA with the newly imported baseline.

## Imported upstream fixes

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
