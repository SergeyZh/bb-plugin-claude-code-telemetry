import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request


UPSTREAM_COMMIT = "8b232325543ae66d4374a71ee4d05838ad5cd793"
UPSTREAM_SOURCE_SHA256 = "3c5463039d22a0643717dd527957a498513b296a1c84b06b09bd9a59054e19ba"
ROOT = Path(__file__).resolve().parents[1]
GIT = ["git", "-c", "core.autocrlf=false", "-c", "core.filemode=false"]


def run(args, cwd):
    return subprocess.run(args, cwd=cwd, check=True, capture_output=True).stdout


def digest(files):
    value = hashlib.sha256()
    for name, data in sorted(files.items()):
        value.update(name.encode() + b"\0")
        value.update(len(data).to_bytes(8, "big"))
        value.update(data)
    return value.hexdigest()


def upstream_files(directory):
    if directory is not None:
        files = {
            p.relative_to(directory).as_posix(): p.read_bytes()
            for p in directory.rglob("*")
            if p.is_file()
            and not {".git", "node_modules", "dist", "upstream-metadata"}.intersection(p.relative_to(directory).parts)
        }
    else:
        url = f"https://codeload.github.com/get-bb/bb/tar.gz/{UPSTREAM_COMMIT}"
        prefix = f"bb-{UPSTREAM_COMMIT}/plugins/provider-claude-code/"
        with urllib.request.urlopen(url, timeout=60) as response:
            archive_bytes = response.read()
        files = {}
        with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as archive:
            for member in archive:
                if not member.isfile() or not member.name.startswith(prefix):
                    continue
                relative = PurePosixPath(member.name[len(prefix):])
                if relative.is_absolute() or ".." in relative.parts:
                    raise ValueError(f"Unsafe archive path: {member.name}")
                files[relative.as_posix()] = archive.extractfile(member).read()
    if digest(files) != UPSTREAM_SOURCE_SHA256:
        raise ValueError("Upstream contents do not match the pinned provider source checksum")
    return files


def fork_files():
    paths = run(GIT + ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], ROOT)
    files = {}
    for encoded in set(paths.split(b"\0")) - {b""}:
        name = encoded.decode()
        relative = Path(name)
        if relative.parts[0] in {"patches", "dist", "node_modules", ".git"}:
            continue
        path = ROOT / relative
        if path.is_file():
            files[relative.as_posix()] = path.read_bytes()
    return files


def write_files(directory, files):
    for name, data in files.items():
        path = directory / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def production_file(name):
    return (name in {"server.ts", "app.ts"} or name.startswith("src/")) and name.endswith(".ts") and not name.endswith(".test.ts") and not name.endswith("delta-test-harness.ts")


def generate(upstream, fork, temporary):
    baseline = temporary / "upstream"
    baseline.mkdir()
    write_files(baseline, upstream)
    work = temporary / "diff"
    shutil.copytree(baseline, work)
    run(GIT + ["init", "-q"], work)
    run(GIT + ["add", "--force", "--all"], work)
    tree = run(GIT + ["write-tree"], work).decode().strip()
    for path in work.iterdir():
        if path.name == ".git":
            continue
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
    write_files(work, fork)
    run(GIT + ["add", "--force", "--all"], work)
    common = ["diff", "--cached", "--binary", "--full-index", "--no-ext-diff", "--no-renames", tree, "--"]
    runtime = sorted(name for name in upstream.keys() | fork.keys() if production_file(name))
    artifacts, summaries = {}, {}
    for name, selected in [("telemetry-runtime.patch", runtime), ("upstream-to-telemetry.patch", [])]:
        patch = run(GIT + common + selected, work)
        patch_file = temporary / name
        patch_file.write_bytes(patch)
        check = temporary / name.removesuffix(".patch")
        shutil.copytree(baseline, check)
        run(GIT + ["apply", "--check", str(patch_file)], check)
        run(GIT + ["apply", str(patch_file)], check)
        actual = {p.relative_to(check).as_posix(): p.read_bytes() for p in check.rglob("*") if p.is_file()}
        expected = dict(fork) if not selected else dict(upstream)
        if selected:
            for key in selected:
                if key in fork:
                    expected[key] = fork[key]
                else:
                    expected.pop(key, None)
        if actual != expected:
            raise ValueError(f"Applied contents differ from the source snapshot: {name}")
        artifacts[name] = patch
        summaries[name] = run(GIT + ["apply", "--stat", str(patch_file)], baseline).decode().strip().splitlines()[-1].strip()
    version = json.loads(fork["package.json"])["version"]
    artifacts["README.md"] = f"""# Upstream comparison patches

Base: [get-bb/bb@{UPSTREAM_COMMIT}](https://github.com/get-bb/bb/tree/{UPSTREAM_COMMIT}/plugins/provider-claude-code).
Target: this fork's source snapshot, version `{version}`.
Source snapshot SHA-256: `{digest(fork)}`.

- [telemetry-runtime.patch](telemetry-runtime.patch): production TypeScript,
  including request telemetry, cache-write lifetime breakdown, per-session TTL
  selection and its frontend price tooltips, provider identity, and usage-source changes.
  {summaries['telemetry-runtime.patch']}.
- [upstream-to-telemetry.patch](upstream-to-telemetry.patch): all source changes,
  including tests, scripts, documentation, standalone packaging, and lockfile.
  {summaries['upstream-to-telemetry.patch']}.

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
""".encode()
    return artifacts


def main():
    parser = argparse.ArgumentParser(description="Regenerate and verify source differences from the pinned BB provider")
    parser.add_argument("--upstream-dir", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    upstream = upstream_files(args.upstream_dir)
    fork = fork_files()
    with tempfile.TemporaryDirectory(prefix="claude-telemetry-patches-") as temporary:
        artifacts = generate(upstream, fork, Path(temporary))
    destination = ROOT / "patches"
    if args.check:
        for name, data in artifacts.items():
            if not (destination / name).is_file() or (destination / name).read_bytes() != data:
                raise SystemExit(f"Stale patch artifact: patches/{name}")
        print("Patches are current; application and resulting contents verified.")
    else:
        destination.mkdir(exist_ok=True)
        for name, data in artifacts.items():
            target = destination / name
            staging = destination / (name + ".tmp")
            staging.write_bytes(data)
            staging.replace(target)
            print(f"Updated patches/{name}")


if __name__ == "__main__":
    main()
