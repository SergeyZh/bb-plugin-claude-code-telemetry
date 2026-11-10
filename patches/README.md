# Upstream comparison patches

Base: [get-bb/bb@0509f46aae61a5b30afac23551b084b0f28b6d4f](https://github.com/get-bb/bb/tree/0509f46aae61a5b30afac23551b084b0f28b6d4f/plugins/provider-claude-code).
Target: this fork's source snapshot, version `0.1.0-telemetry.3+upstream.0509f46`.
Source snapshot SHA-256: `519fd323bde5b9736d7db3874a54a21507c5a549ed4615cf48e4e007c2a87a77`.

- [telemetry-runtime.patch](telemetry-runtime.patch): production TypeScript,
  including request telemetry, cache-write lifetime breakdown, per-session TTL
  selection, provider identity, and usage-source changes.
  10 files changed, 234 insertions(+), 27 deletions(-).
- [upstream-to-telemetry.patch](upstream-to-telemetry.patch): all source changes,
  including tests, scripts, documentation, standalone packaging, and lockfile.
  46 files changed, 5857 insertions(+), 218 deletions(-).

Both patches use paths relative to the original provider package. From a BB
repository checkout at the pinned base, run:

```sh
git apply --check --directory=plugins/provider-claude-code /absolute/path/to/telemetry-runtime.patch
git apply --directory=plugins/provider-claude-code /absolute/path/to/telemetry-runtime.patch
```

Substitute `upstream-to-telemetry.patch` to apply the full source comparison.
The full patch excludes `patches/` itself to avoid recursive patch contents,
as well as generated `dist/`, dependencies, and Git metadata. The two patches
are alternatives against the same base; do not apply one on top of the other.

## Regeneration

From the fork root:

```sh
python3 scripts/update-upstream-patches.py
python3 scripts/update-upstream-patches.py --check
```

The script downloads the pinned upstream archive. To use an existing copy of
that exact provider directory, add `--upstream-dir /path/to/provider-claude-code`.
Its contents must match the pinned source checksum. When importing a new
upstream baseline, update the commit and source checksum in the script.

Inputs are tracked and nonignored source files in the working tree, excluding
`patches/`, build output, and dependencies. The snapshot hash covers file paths
and bytes, not commit metadata. Generation verifies both patches by applying
them to disposable upstream copies and comparing every resulting file.
`--check` also verifies that the committed artifacts are current without
rewriting them.
