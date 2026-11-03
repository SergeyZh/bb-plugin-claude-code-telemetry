# Upstream

Forked from https://github.com/get-bb/bb/tree/916d684ac23d0b0de82c09cfc7553a50287d2188/plugins/provider-claude-code

MIT license, Copyright (c) 2026 Michael Yong. See LICENSE.

This standalone fork registers `claude-code-telemetry`; it never replaces `claude-code`.

## Imported upstream fixes

Synced the provider changes through
[`51d8ddc`](https://github.com/get-bb/bb/commit/51d8ddc75aa0ae68d8a87844fbf8938eeb2bf47d)
on 2026-11-03, preserving this fork's identity and request telemetry:

- [`9dec2ae`](https://github.com/get-bb/bb/commit/9dec2aefb8852514942ffafc16a2316ae304de6e):
  stream transcript reads and writes when forking long sessions.
- [`cdd1d66`](https://github.com/get-bb/bb/commit/cdd1d666aaf6ad744a9788065154b41d27f914c0):
  fork sessions in a worker so an out-of-memory failure stays isolated.
- [`51d8ddc`](https://github.com/get-bb/bb/commit/51d8ddc75aa0ae68d8a87844fbf8938eeb2bf47d):
  emit Bash descriptions and preserve real command exit codes.

The description field was introduced with BB Plugin SDK 0.6.117, which is not
yet published to npm as of this sync. This fork keeps its published SDK 0.6.104
dependency and emits the upstream field on the wire. Description regressions
therefore assert the outgoing deltas directly; the older SDK assembler drops
the field. Displaying descriptions requires a BB host that supports SDK
0.6.117's command description field. Exit codes and fork fixes work with the
existing host.
