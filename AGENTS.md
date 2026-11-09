# Claude Code Telemetry fork

This repository is a standalone fork of the BB Claude Code provider. Preserve
provider ID `claude-code-telemetry`, request telemetry, cache-write lifetime
breakdown, per-thread prompt cache TTL, and standalone packaging when syncing.

## Checking for upstream changes

Upstream is **`get-bb/bb`**, directory **`plugins/provider-claude-code`**.
This repository's `origin` is our fork, not upstream. Do not use the upstream
package version as a change detector: it may remain `0.1.0` across many commits.

1. Read `UPSTREAM.md` and `UPSTREAM_COMMIT` in
   `scripts/update-upstream-patches.py`. That full SHA is the imported baseline;
   the original fork SHA at the top of `UPSTREAM.md` is historical only.
2. Query GitHub directly with the authenticated `gh` CLI. Resolve the default
   branch and its HEAD once, then pin the history query to that SHA:

   ```sh
   upstream_branch=$(gh api repos/get-bb/bb --jq .default_branch)
   upstream_head=$(gh api "repos/get-bb/bb/commits/$upstream_branch" --jq .sha)
   gh api "repos/get-bb/bb/commits?sha=$upstream_head&path=plugins/provider-claude-code&per_page=100" \
     --jq '.[] | [.sha, .commit.committer.date, (.commit.message | split("\n")[0])] | @tsv'
   ```

   Results are newest first. Stop at the imported baseline. If it is not on the
   first page, request `&page=2`, etc., until it is found. If history has diverged
   or the baseline is missing, inspect ancestry before claiming a complete list.
   If the baseline equals the latest provider commit, report no new changes.
3. Inspect each newer commit, including its explanation and provider patches.
   Keep output bounded; commits can also touch many unrelated BB files:

   ```sh
   gh api "repos/get-bb/bb/commits/<full-sha>" --jq \
     '{sha, message: .commit.message, files: [.files[] | select(.filename | startswith("plugins/provider-claude-code/")) | {filename, status, additions, deletions, patch}]}'
   ```

   The repository-wide compare API truncates its file list at 300 files; an
   absent provider path there does **not** prove there were no changes. Commit
   file lists can also paginate, and patches can be omitted or truncated. For
   large changes, fetch git history or compare provider directories from the
   exact baseline and target archives. Inspect external SDK/host changes only
   when a provider change depends on them.
4. Check whether each change is already present locally. Report new provider
   commits with dates, GitHub commit links, practical effects, and any host/SDK
   requirements. A request to check upstream alone does not request an import.

## Importing upstream changes when requested

- Apply changes oldest first, adapting `src/bridge/` paths and preserving fork
  behavior. Include upstream regression tests and retain our extra coverage.
  Do not overwrite whole fork files with upstream versions without comparing.
- Keep dependencies and SDK compatibility deliberate. `bb plugin types`
  repins dependencies; do not run it merely to silence a build warning.
- Set the baseline to the latest fully imported provider commit, not an
  arbitrary newer repository HEAD. Update `UPSTREAM_COMMIT` and
  `UPSTREAM_SOURCE_SHA256` in `scripts/update-upstream-patches.py`. The checksum
  uses that script's `digest()` over every provider file from the exact archive:
  `https://codeload.github.com/get-bb/bb/tar.gz/<full-sha>`.
- Update `UPSTREAM.md`, README/overview baseline links, and `VERIFICATION.md`.
  Version format is
  `<upstream-package-version>-telemetry.<revision>+upstream.<first-7-sha>`.
  Increment the fork revision for each release, including local fixes; update
  both `package.json` and the root version entries in `package-lock.json`.
- Run `npm run typecheck`, `npm test`, and `npm run build` for a code import.
  Distinguish automated checks from live checks in the verification notes.
- Regenerate comparison patches after **all** tracked source/documentation
  edits (including this file):

  ```sh
  python3 scripts/update-upstream-patches.py
  python3 scripts/update-upstream-patches.py --check
  git diff --check
  ```

  Both commands accept `--upstream-dir /path/to/exact/provider-directory` to
  reuse an extracted pinned archive; its checksum must match. Do not assume a
  temporary archive from a previous session still exists.
- When reload is requested, build first, confirm
  `bb plugin source claude-code-telemetry` points at this checkout, then run
  `bb plugin reload claude-code-telemetry`. Inspect `bb plugin list --json` for
  the target plugin's version, enabled state, running status, and handler errors.
  Redirect JSON to a temporary file and print only the target entry: reload
  can return the entire plugin inventory even when one ID was requested.
