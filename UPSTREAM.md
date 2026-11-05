# Upstream

Forked from https://github.com/get-bb/bb/tree/916d684ac23d0b0de82c09cfc7553a50287d2188/plugins/provider-claude-code

MIT license, Copyright (c) 2026 Michael Yong. See LICENSE.

This standalone fork registers `claude-code-telemetry`; it never replaces `claude-code`.

Review the [source comparison patches](patches/README.md) for production-only
and full-source diffs against the latest imported upstream revision, including
instructions to reproduce and verify them.

## Versioning

The package version follows `<upstream-provider-version>-telemetry.<revision>`.
The upstream provider package is currently `0.1.0`, so the first numbered fork
revision is `0.1.0-telemetry.1`; subsequent revisions use `telemetry.2`, and so on.
This is valid SemVer, unlike a four-component version such as `0.1.0.1`.
The base refers to the BB provider package, not the Claude Code CLI or Agent SDK.

## Imported upstream fixes

Synced the provider changes through
[`6d5597d`](https://github.com/get-bb/bb/commit/6d5597d2851d4cef6d2fa22301d828daa6fbf319)
on 2026-11-05, preserving this fork's identity and request telemetry:

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
