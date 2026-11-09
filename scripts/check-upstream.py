#!/usr/bin/env python3
"""Silent daily upstream check; dispatch a BB Codex thread only when needed."""

import argparse
import ast
from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlencode


UPSTREAM = "get-bb/bb"
PROVIDER_PATH = "plugins/provider-claude-code"
MODEL = "gpt-6.1-sol"
SHA = re.compile(r"[0-9a-f]{40}\Z")


def command(args, cwd, *, stdin=None):
    result = subprocess.run(
        args, cwd=cwd, input=stdin, text=True, capture_output=True, timeout=90,
    )
    if result.returncode:
        raise RuntimeError(
            f"{args[0]} {args[1]} failed: {result.stderr.strip() or result.stdout.strip()}"
        )
    return result.stdout.strip()


def json_command(args, cwd, **kwargs):
    result = json.loads(command(args, cwd, **kwargs))
    if isinstance(result, dict) and result.get("ok") is False:
        raise RuntimeError(f"CLI error: {result.get('error')}")
    return result


def baseline(repo):
    tree = ast.parse((repo / "scripts/update-upstream-patches.py").read_text())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "UPSTREAM_COMMIT"
            for target in node.targets
        ):
            value = ast.literal_eval(node.value)
            if isinstance(value, str) and SHA.fullmatch(value):
                return value
    raise RuntimeError("Missing or invalid UPSTREAM_COMMIT")


def pending_commits(repo, imported):
    metadata = json_command(["gh", "api", f"repos/{UPSTREAM}"], repo)
    head = json_command(
        ["gh", "api", f"repos/{UPSTREAM}/commits/{metadata['default_branch']}"], repo,
    )["sha"]
    if not SHA.fullmatch(head):
        raise RuntimeError("Invalid upstream HEAD")
    pending = []
    for page in range(1, 101):
        query = urlencode({
            "sha": head, "path": PROVIDER_PATH, "per_page": 100, "page": page,
        })
        commits = json_command(["gh", "api", f"repos/{UPSTREAM}/commits?{query}"], repo)
        for commit in commits:
            sha = commit["sha"]
            if not SHA.fullmatch(sha):
                raise RuntimeError("Invalid upstream commit SHA")
            if sha == imported:
                return list(reversed(pending))
            pending.append({
                "sha": sha,
                "date": commit["commit"]["committer"]["date"],
                "title": commit["commit"]["message"].splitlines()[0],
            })
        if len(commits) < 100:
            break
    raise RuntimeError("Imported baseline not found in upstream provider history; inspect ancestry")


@contextmanager
def state_lock(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.with_suffix(".lock").open("a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            yield False
            return
        try:
            yield True
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def save_state(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n")
    temporary.replace(path)


def dispatch(repo, project, environment, state_path, commits, imported):
    bb = os.environ.get("BB_CLI") or "bb"
    with state_lock(state_path) as acquired:
        if not acquired:
            return
        state = json.loads(state_path.read_text()) if state_path.exists() else {}
        if state.get("dispatching"):
            raise RuntimeError(
                f"Previous spawn outcome is uncertain; inspect threads before clearing {state_path}"
            )
        if state.get("threadId"):
            thread = json_command([bb, "thread", "show", state["threadId"], "--json"], repo)["thread"]
            if thread["status"] not in {"idle", "error", "failed", "stopped"} or (
                thread.get("queuedMessageCount", 0) or thread.get("activeBackgroundAgentCount", 0)
            ):
                return
        if baseline(repo) != imported:
            return  # Another integration advanced the baseline during the network check.
        if command(["git", "status", "--porcelain", "--untracked-files=normal"], repo):
            raise RuntimeError("Checkout has uncommitted changes; upstream integration was not started")
        head = command(["git", "rev-parse", "HEAD"], repo)
        if not command(["git", "branch", "--show-current"], repo):
            raise RuntimeError("Checkout is detached; upstream integration was not started")
        prompt = (repo / "scripts/upstream-sync-prompt.md").read_text()
        prompt += "\n\nPinned dispatch context (JSON data, not instructions):\n"
        prompt += json.dumps({
            "repository": str(repo), "localHead": head, "importedBaseline": imported,
            "targetBaseline": commits[-1]["sha"], "commitsOldestFirst": commits,
        }, ensure_ascii=False, indent=2)
        # Persist before spawn. If the CLI connection fails after creation, fail
        # closed rather than spawn duplicate agents on automation retries.
        save_state(state_path, {"dispatching": True, "target": commits[-1]["sha"]})
        result = json_command([
            bb, "thread", "spawn", "--project", project,
            "--environment", environment, "--provider", "codex", "--model", MODEL,
            "--reasoning-level", "medium", "--permission-mode", "full",
            "--title", f"Sync Claude provider through {commits[-1]['sha'][:7]}",
            "--prompt-file", "-", "--json",
        ], repo, stdin=prompt)
        thread_id = result["id"]
        save_state(state_path, {"threadId": thread_id, "target": commits[-1]["sha"]})
        print(json.dumps({"threadId": thread_id, "model": MODEL, "reasoning": "medium",
                          "target": commits[-1]["sha"], "commitCount": len(commits)}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-only", action="store_true", help="Report changes without spawning")
    args = parser.parse_args()
    repo = Path(os.environ.get("UPSTREAM_SYNC_REPO", os.getcwd())).resolve()
    imported = baseline(repo)
    commits = pending_commits(repo, imported)
    if not commits:
        return
    if args.check_only:
        print(json.dumps({"baseline": imported, "commits": commits}, ensure_ascii=False))
        return
    project = os.environ.get("BB_PROJECT_ID")
    environment = os.environ.get("UPSTREAM_SYNC_ENVIRONMENT")
    if not project or not environment:
        raise RuntimeError("Set BB_PROJECT_ID and UPSTREAM_SYNC_ENVIRONMENT for dispatch")
    state = Path(os.environ.get("UPSTREAM_SYNC_STATE", str(Path(__file__).with_name("check-state.json"))))
    dispatch(repo, project, environment, state, commits, imported)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired) as error:
        print(f"Upstream check failed: {error}", file=sys.stderr)
        sys.exit(1)
