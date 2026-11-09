import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("upstream_check", Path(__file__).with_name("check-upstream.py"))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)
BASE = "a" * 40
TARGET = "b" * 40


def commit(sha):
    return {"sha": sha, "commit": {"committer": {"date": "2026-11-09T00:00:00Z"},
                                    "message": "Provider change\n\nDetails"}}


class HistoryTests(unittest.TestCase):
    def history(self, pages):
        return patch.object(check, "json_command", side_effect=[
            {"default_branch": "main"}, {"sha": "c" * 40}, *pages,
        ])

    def test_unchanged(self):
        with self.history([[commit(BASE)]]):
            self.assertEqual(check.pending_commits(Path.cwd(), BASE), [])

    def test_paginates_pinned_head_and_orders_oldest_first(self):
        page = [commit(f"{n:040x}") for n in range(100)]
        with self.history([page, [commit(TARGET), commit(BASE)]]) as api:
            changes = check.pending_commits(Path.cwd(), BASE)
            self.assertEqual(changes[0]["sha"], TARGET)
            self.assertEqual(len(changes), 101)
            self.assertIn("page=2", api.call_args_list[-1].args[0][-1])
            self.assertIn("sha=" + "c" * 40, api.call_args_list[-1].args[0][-1])

    def test_missing_baseline_fails_without_partial_result(self):
        with self.history([[commit(TARGET)]]):
            with self.assertRaisesRegex(RuntimeError, "baseline not found"):
                check.pending_commits(Path.cwd(), BASE)

    def test_no_changes_are_silent_and_do_not_dispatch(self):
        with patch.object(check, "baseline", return_value=BASE), \
             patch.object(check, "pending_commits", return_value=[]), \
             patch.object(check, "dispatch") as dispatch, \
             patch("sys.argv", ["check-upstream.py"]), \
             patch("builtins.print") as output:
            check.main()
            dispatch.assert_not_called()
            output.assert_not_called()


class DispatchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        (self.repo / "scripts").mkdir()
        (self.repo / "scripts/upstream-sync-prompt.md").write_text("Integrate safely.")
        self.state = self.repo / "state.json"
        self.commits = [{"sha": TARGET, "date": "2026-11-09", "title": "Provider change"}]
        self.env = patch.dict(os.environ, {"BB_CLI": "bb"})
        self.env.start()
        self.addCleanup(self.env.stop)

    def dispatch(self):
        check.dispatch(self.repo, "proj_test", "env_test", self.state, self.commits, BASE)

    def test_active_thread_prevents_duplicate(self):
        self.state.write_text(json.dumps({"threadId": "thr_existing"}))
        with patch.object(check, "json_command", return_value={"thread": {"status": "active"}}) as api:
            self.dispatch()
            self.assertEqual(api.call_count, 1)

    def test_uncommitted_files_prevent_spawn(self):
        with patch.object(check, "baseline", return_value=BASE), \
             patch.object(check, "command", return_value=" M package.json"), \
             patch.object(check, "json_command") as api:
            with self.assertRaisesRegex(RuntimeError, "uncommitted"):
                self.dispatch()
            api.assert_not_called()

    def test_spawn_records_thread_and_exact_model(self):
        with patch.object(check, "baseline", return_value=BASE), \
             patch.object(check, "command", side_effect=["", "d" * 40, "main"]), \
             patch.object(check, "json_command", return_value={"id": "thr_new"}) as api, \
             patch("builtins.print"):
            self.dispatch()
            args = api.call_args.args[0]
            self.assertEqual(args[args.index("--model") + 1], "gpt-6.1-sol")
            self.assertEqual(args[args.index("--reasoning-level") + 1], "medium")
            self.assertEqual(args[args.index("--environment") + 1], "env_test")
            self.assertIn(TARGET, api.call_args.kwargs["stdin"])
            self.assertEqual(json.loads(self.state.read_text())["threadId"], "thr_new")

    def test_uncertain_spawn_is_not_repeated_after_connection_failure(self):
        with patch.object(check, "baseline", return_value=BASE), \
             patch.object(check, "command", side_effect=["", "d" * 40, "main"]), \
             patch.object(check, "json_command", side_effect=RuntimeError("connection lost")):
            with self.assertRaisesRegex(RuntimeError, "connection lost"):
                self.dispatch()
        self.assertTrue(json.loads(self.state.read_text())["dispatching"])
        with patch.object(check, "json_command") as api:
            with self.assertRaisesRegex(RuntimeError, "uncertain"):
                self.dispatch()
            api.assert_not_called()

    def test_changed_baseline_prevents_stale_dispatch(self):
        with patch.object(check, "baseline", return_value=TARGET), \
             patch.object(check, "json_command") as api:
            self.dispatch()
            api.assert_not_called()

    def test_lock_prevents_concurrent_dispatch(self):
        with check.state_lock(self.state) as acquired:
            self.assertTrue(acquired)
            with patch.object(check, "json_command") as api:
                self.dispatch()
                api.assert_not_called()


if __name__ == "__main__":
    unittest.main()
