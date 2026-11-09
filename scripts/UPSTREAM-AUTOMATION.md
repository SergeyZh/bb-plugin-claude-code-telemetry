# Daily upstream integration

BB automation `auto_syvconbnnhc` in project `proj_zpyirjtmqp` runs
`check-upstream.py` daily at **09:00 Europe/Berlin** (`0 9 * * *`). The BB
server must be running on this Mac, with authenticated `gh` and Codex access.

The checker reads the baseline from `update-upstream-patches.py`, pins the
upstream default branch HEAD, and paginates the provider's commit history.
No changes means no stdout/stderr, no model call, and a silent skipped tick.
It fails if the baseline cannot be found rather than importing uncertain history.

When changes exist, it starts one BB thread in environment `env_r4vevp8jj8`
(this checkout), with provider `codex`, model `gpt-6.1-sol`, reasoning `medium`,
and Full Access for unattended local maintenance. The prompt is read from
`scripts/upstream-sync-prompt.md` in the checkout at dispatch time. It requires:

- Complete import through the pinned provider commit, preserving fork behavior.
- A release version bump with the new upstream SHA, documentation and patch updates.
- Typecheck, tests, build, and comparison-patch verification before committing.
- A local unsigned commit using
  `git -c commit.gpgsign=false commit --no-gpg-sign`; signing settings stay intact.
- No push or plugin reload.

The checker refuses to dispatch over uncommitted files or a detached HEAD.
The agent also rechecks the dispatch HEAD and baseline before editing. A file
lock prevents concurrent dispatch, and a persisted thread ID prevents another
integration while its thread or background agents are active. Finished attempts
can be retried on a later check if changes still remain and the checkout is clean.
An incomplete attempt that leaves edits requires inspection before another run.

## Inspect or run

```sh
# Read-only check: prints JSON only when newer provider commits exist.
python3 scripts/check-upstream.py --check-only

# Checker unit tests (no network, model calls, or tracked bytecode files).
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py' -v

bb automation show auto_syvconbnnhc --project proj_zpyirjtmqp
bb automation runs auto_syvconbnnhc --project proj_zpyirjtmqp --limit 5
bb automation run auto_syvconbnnhc --project proj_zpyirjtmqp
bb automation pause auto_syvconbnnhc --project proj_zpyirjtmqp
bb automation resume auto_syvconbnnhc --project proj_zpyirjtmqp
```

Script automations store a private copy of the checker. After changing
`check-upstream.py`, refresh that copy from this checkout:

```sh
bb automation update auto_syvconbnnhc --project proj_zpyirjtmqp \
  --script-file scripts/check-upstream.py
```

The prompt file is read live and needs no automation refresh. If the checkout
or BB environment moves, update the automation working directory and
`UPSTREAM_SYNC_REPO` / `UPSTREAM_SYNC_ENVIRONMENT` variables together.

Dispatch state is stored beside the private checker copy, normally
`~/.bb/plugins/automations/scripts/auto_syvconbnnhc/check-state.json`.
If a spawn call loses its connection after creating a thread, the state remains
`dispatching` and subsequent runs fail rather than spawn duplicates. Inspect the
project's threads first; recover the correct thread ID in that state, or clear
the marker only after verifying there is no active integration. Do not clear
the state of a running integration. `UPSTREAM_SYNC_STATE` can override its path.

## Initial validation

The checker has 10 passing unit tests for pagination, no-op silence, missing
baselines, concurrency, exact model selection, checkout changes, and uncertain
spawn outcomes. A live read-only GitHub check found no new provider commits.
The initial manual BB run also exited zero with empty output and was recorded
as a skipped silent tick. No integration agent was needed or spawned.
