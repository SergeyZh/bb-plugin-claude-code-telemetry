---
name: claude-code-telemetry
description: "Configure or troubleshoot the standalone Claude Code Telemetry provider and request usage."
---

# Claude Code Telemetry provider

Read settings with `bb plugin config claude-code-telemetry`; change a declared key
with `bb plugin config claude-code-telemetry set <key> <value>`.

Cache lifetime is a per-thread model option, not a global plugin setting.
In the new-thread model picker, choose Prompt cache TTL:
Automatic (`auto`, the default), 5 minutes (`5m`), or 1 hour (`1h`). CLI:
`bb thread spawn --provider claude-code-telemetry --option promptCacheTtl=1h --prompt "Task"`.
SDK callers use `sessionOptions: { promptCacheTtl: "1h" }`. Existing threads can
use `bb thread options <id> --set promptCacheTtl=5m`; changes restart Claude
before the next turn while preserving the conversation. Resume and fork keep
the selected option. Automatic removes this plugin's session override and
respects Claude Code's settings/defaults. This controls the main conversation;
subagents retain their separate policy. Requires Claude Code 2.1.242 or later.
TTL environment overrides retain Claude Code's documented precedence. The
selection does not fabricate observed TTL or write-lifetime telemetry.

- `subagentsDisabled` defaults to `false`. Enable with
  `bb plugin config claude-code-telemetry set subagentsDisabled true` to remove
  native Agent, Task, and ListAgents tools from the model context. Changes
  restart Claude before the next turn, preserving the conversation. A deny hook
  also blocks native delegation during an active turn after disabling it.
- `disable1MContext` defaults to `false`. Enable with
  `bb plugin config claude-code-telemetry set disable1MContext true` to set
  `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` (`0` when off). Changes restart the
  thread's Claude process before its next turn, preserving context.
- `chromeEnabled` defaults to `false`. It starts Claude Code with `--chrome` for
  Claude in Chrome tools. The host needs the extension and a claude.ai login.
  A change restarts the thread's Claude process before its next turn, preserving
  context.
- `artifactsEnabled` defaults to `false`. Enable with
  `bb plugin config claude-code-telemetry set artifactsEnabled true` to set
  `CLAUDE_CODE_ARTIFACT=1`, which gives threads Claude Code's `Artifact`,
  `ArtifactComments`, and `ArtifactData` tools for reading `claude.ai/artifact/`
  links and publishing pages. Claude Code withholds them from SDK sessions
  unless opted in. Claude may publish private pages to claude.ai without asking.
  The claude.ai account's plan and organization policy still decide whether the
  tools load. When off, bb leaves an inherited `CLAUDE_CODE_ARTIFACT` (shell,
  environment, or `~/.claude/settings.json` `env`) untouched. A change restarts
  the thread's Claude process before its next turn, preserving context.
- Select the Fast service tier in the model picker or pass `--service-tier fast`
  to `bb thread spawn` for supported Opus models. Use
  `bb thread tell --service-tier fast` to change a thread on its next turn;
  `default` turns it off. Fast mode requires eligible Claude access;
  subscription accounts need usage credits. It is billed at premium rates.
  The provider passes the selection as a session-scoped SDK setting, so it
  does not change the user's Claude defaults.
- `sandboxEnabled` defaults to `true`. In Accept Edits and Approve for me modes
  bb runs Claude Code's Bash commands in its sandbox. Set it to `false` to use
  Claude Code's own command approvals and sandbox settings instead. A change
  restarts the thread's Claude process before its next turn, preserving context.
- `fullAccessApprovalsEnabled` defaults to `false`, so Full Access approves
  every request Claude Code sends, and unattended threads never wait. Set it to
  `true` to show Claude Code's own prompts in Full Access: `permissions.ask`
  rules, PreToolUse hooks that answer `ask`, and its built-in safety checks
  (such as `rm` on a possibly-empty variable). It applies from the thread's
  next turn without a restart. When bb runs as root, Full Access always
  approves, because Claude Code refuses `bypassPermissions` there.
- `commandDescriptionsEnabled` defaults to `false`, so Bash command rows are
  titled with the command. Set it to `true` to title them with Claude's short
  description of the command instead; approval prompts and the expanded row
  still show the command. It takes effect from each thread's next message;
  existing rows keep their titles.
  Displaying descriptions requires a BB host with SDK 0.6.117 support. Older
  hosts ignore the description field; command execution is unaffected.
- bb passes only `BB_CLAUDE_CODE_EXECUTABLE` and `CLAUDE_CODE_OAUTH_TOKEN` to
  the CLI. Mint the token with `claude setup-token` for machines with no
  interactive login.
- Claude Code's own slash commands, including bundled skills such as
  `/simplify` and `/code-review`, appear in the composer's `/` menu,
  `bb project commands`, and `bb thread commands`. The provider reads them from
  Claude Code for the project folder without sending a prompt. With **No project**
  selected, it uses an empty catalog folder on the selected machine so global
  commands appear before a workspace exists. Each thread refreshes them when a
  turn starts. Commands for settings bb manages (such as
  `/model`, `/config`, `/fast`), terminal-only commands (such as `/doctor`),
  and bb's own skills are left out.
- Structured plan, message editing, and compaction are supported through the
  corresponding `bb thread` commands. Unlisted model IDs are accepted by the
  provider; verify actual availability on the target host.

Inspect the thread and provider state after a change; do not restart unrelated
threads or change settings merely to answer a question.

Automatic context breakdowns run in a separate, non-persisted fork of the saved
conversation. Reporting never sends prompts or control requests to the live
Claude session. A timeout, replacement, or thread stop closes the reporter;
the live conversation does not wait for reporting or restart because of it.

This standalone provider has id `claude-code-telemetry`. The built-in
`claude-code` provider is independent. Select Claude Code Telemetry for new
threads; do not migrate or restart existing Claude Code threads.

Usage is emitted once per main-agent message ID after its last observed block,
when the next request arrives or the turn settles. Each standard usage event
is preceded by `thread/extensionState/updated` with kind
`claude-code-telemetry/usage`. Its payload records messageId, model, counts,
source (`request` or `aggregate-remainder`), and incomplete. An aggregate
remainder can include subagents or requests not exposed by the SDK. It is not
an individual request. A process interruption flushes the last observed
request with incomplete=true. Requests without a stable message ID or complete
cache counters are represented only by the final aggregate remainder.

New usage metadata includes `cacheWriteBreakdown` with `fiveMinuteTokens`,
`oneHourTokens`, and `unknownTokens`. These are observed write-token counts,
not inferred from `promptCacheTtlMs`. Unreported lifetime fields are null;
unknown write tokens remain separate. An unknown total write count makes the
whole breakdown null. Older events can omit the field. For aggregate remainders,
lifetime counts are subtracted only when the observed requests make that
subtraction unambiguous. Consumers must read this field from event history;
the current extension state contains only the latest report. Existing Cache
Watch versions ignore the field and continue displaying their cost range.
