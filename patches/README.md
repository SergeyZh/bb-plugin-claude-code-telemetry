# Upstream comparison patches

Base: [get-bb/bb@ac2829b9a66004c32d2f4b04e01b9176222b2af1](https://github.com/get-bb/bb/tree/ac2829b9a66004c32d2f4b04e01b9176222b2af1/plugins/provider-claude-code).
Target: this fork's source snapshot, version `0.1.0-telemetry.2+upstream.ac2829b`.
Source snapshot SHA-256: `455287006fba127be8fe6089c0c7c2960c54cac2a7ba7291f5875158ece7af43`.

- [telemetry-runtime.patch](telemetry-runtime.patch): production TypeScript,
  including request telemetry, cache-write lifetime breakdown, per-session TTL
  selection, provider identity, and usage-source changes.
  10 files changed, 234 insertions(+), 27 deletions(-).
- [upstream-to-telemetry.patch](upstream-to-telemetry.patch): all source changes,
  including tests, scripts, documentation, standalone packaging, and lockfile.
  45 files changed, 5264 insertions(+), 217 deletions(-).

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
