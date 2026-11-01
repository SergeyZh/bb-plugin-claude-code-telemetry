import { expect, it } from 'vitest';
import { query, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { createClaudeDeltaHarness } from './delta-test-harness';
it.skipIf(process.env.CLAUDE_TELEMETRY_LIVE !== '1')('live SDK main-agent requests keep final aggregate totals', async () => {
  const harness = createClaudeDeltaHarness();
  const events = [];
  let finalUsage: SDKResultMessage['usage'] | undefined;
  const session = query({
    prompt: 'Use Bash exactly once to run printf telemetry-smoke-ok, then reply with only that output. This is a telemetry integration check.',
    options: { cwd: '/tmp', model: 'claude-haiku-4-5-20251001', maxTurns: 3,
      tools: ['Bash'], settingSources: [], persistSession: false, maxBudgetUsd: 0.1,
      systemPrompt: 'Follow the requested telemetry check precisely.',
      canUseTool: async (name, input) => name === 'Bash' && input.command === 'printf telemetry-smoke-ok'
        ? { behavior: 'allow', updatedInput: input } : { behavior: 'deny', message: 'Only the telemetry printf check is permitted.' },
    },
  });
  try {
    for await (const message of session) {
      events.push(...harness.translate(message));
      if (message.type === 'result') {
        expect(message.subtype).toBe('success');
        finalUsage = message.usage;
      }
    }
  } finally { session.close(); }
  const reports = events.filter(e => e.type === 'thread/tokenUsage/updated');
  const requests = events.filter(e => e.type === 'thread/extensionState/updated' && e.kind === 'claude-code-telemetry/usage');
  expect(reports.length).toBeGreaterThanOrEqual(2);
  const total = reports.at(-1)!.tokenUsage.total;
  expect(total.inputTokens).toBe(finalUsage!.input_tokens);
  expect(total.outputTokens).toBe(finalUsage!.output_tokens);
  expect(total.cacheReadInputTokens).toBe(finalUsage!.cache_read_input_tokens);
  expect(total.cacheWriteInputTokens).toBe(finalUsage!.cache_creation_input_tokens);
  console.log(JSON.stringify({ requests: requests.length, reports: reports.length, total }));
}, 90000);
