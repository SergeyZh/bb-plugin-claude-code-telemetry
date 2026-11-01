import { describe, expect, it } from 'vitest';
import { ZERO_TOKEN_USAGE, type ThreadDelta } from '@get-bb/plugin-sdk/provider-bridge';
import { ClaudeRequestUsage } from './request-usage';
import { createClaudeDeltaHarness, loadFixture, loadSessionFixture } from './delta-test-harness';
const counts = (input = 10, output = 20, read = 30, write = 40) => ({ inputTokens: input, outputTokens: output,
  cacheReadInputTokens: read, cacheWriteInputTokens: write, cachedInputTokens: read + write,
  totalTokens: input + output + read + write, reasoningOutputTokens: 0 });
const message = (id: string, output = 20) => ({ id, model: 'claude-sonnet-4-6',
  usage: { input_tokens: 10, output_tokens: output, cache_read_input_tokens: 30, cache_creation_input_tokens: 40 } });
const usage = (deltas: ThreadDelta[]) => deltas.filter(d => d.kind === 'usage');

describe('per-request Claude usage', () => {
  it('buffers partial blocks, deduplicates message IDs, and retains the final output count', () => {
    const collector = new ClaudeRequestUsage();
    expect(collector.observe(message('one', 1), ZERO_TOKEN_USAGE, null)).toEqual([]);
    collector.observe(message('one', 20), ZERO_TOKEN_USAGE, null);
    collector.observe(message('one', 1), ZERO_TOKEN_USAGE, null);
    const first = collector.observe(message('two'), ZERO_TOKEN_USAGE, null);
    expect(usage(first)).toEqual([{ kind: 'usage', total: counts(), last: counts(), modelContextWindow: null }]);
    expect(collector.observe(message('one'), counts(), null)).toEqual([]);
    const second = collector.flush(counts(), null);
    expect(usage(second)[0].total).toMatchObject(counts(20, 40, 60, 80));
    expect(collector.reconcile(counts(20, 40, 60, 80), counts(20, 40, 60, 80), null)).toEqual([]);
  });

  it('reports only the unobserved aggregate remainder and marks it as combined', () => {
    const collector = new ClaudeRequestUsage();
    collector.observe(message('one'), ZERO_TOKEN_USAGE, null);
    collector.flush(ZERO_TOKEN_USAGE, null);
    const deltas = collector.reconcile(counts(), counts(15, 27, 41, 53), null);
    expect(usage(deltas)[0]).toMatchObject({ total: counts(15, 27, 41, 53), last: counts(5, 7, 11, 13) });
    expect(deltas[0]).toMatchObject({ kind: 'extension.state', payload: { source: 'aggregate-remainder', incomplete: true } });
  });

  it('retains unknown optional cache counters in aggregate fallback and rejects malformed requests', () => {
    const collector = new ClaudeRequestUsage();
    for (const value of [null, {}, message(''), { ...message('bad'), usage: { ...message('bad').usage, input_tokens: -1 } }])
      expect(collector.observe(value, ZERO_TOKEN_USAGE, null)).toEqual([]);
    const aggregate = { ...ZERO_TOKEN_USAGE, inputTokens: 12, totalTokens: 12 };
    expect(usage(collector.reconcile(ZERO_TOKEN_USAGE, aggregate, null))[0].last).toEqual(aggregate);
  });

  it('starts a new turn without losing cumulative session totals and flushes on interruption', () => {
    const collector = new ClaudeRequestUsage();
    collector.observe(message('one'), ZERO_TOKEN_USAGE, null);
    collector.flush(ZERO_TOKEN_USAGE, null);
    collector.resetTurn();
    collector.observe(message('one'), counts(), null);
    const interrupted = collector.flush(counts(), null, true);
    expect(usage(interrupted)[0].total).toEqual(counts(20, 40, 60, 80));
    expect(interrupted[0]).toMatchObject({ payload: { incomplete: true } });
  });

  it('persists thread metadata immediately before each scoped usage report through the real delta assembler', () => {
    const harness = createClaudeDeltaHarness();
    const events = [
      ...harness.translate({ type: 'assistant', message: { ...message('one', 1), content: [] } }),
      ...harness.translate({ type: 'assistant', message: { ...message('one', 20), content: [] } }),
      ...harness.translate({ type: 'assistant', message: { ...message('two'), content: [] } }),
      ...harness.translate({ ...loadFixture('result-success.json'), usage: {
        input_tokens: 20, output_tokens: 40, cache_read_input_tokens: 60, cache_creation_input_tokens: 80,
      } }),
    ];
    const reports = events.filter(e => e.type === 'thread/tokenUsage/updated');
    expect(reports).toHaveLength(2);
    expect(reports[1].tokenUsage.total).toEqual(counts(20, 40, 60, 80));
    const metadata = events.filter(e => e.type === 'thread/extensionState/updated');
    expect(metadata.map(e => e.payload)).toMatchObject([{ messageId: 'one', incomplete: false }, { messageId: 'two', incomplete: false }]);
    for (const report of reports) expect(events[events.indexOf(report) - 1].type).toBe('thread/extensionState/updated');
    expect(harness.translate(loadFixture('result-success.json'))).toEqual([]);
  });

  it('handles a recorded SDK transcript with repeated partial assistant messages', () => {
    const harness = createClaudeDeltaHarness();
    const events = loadSessionFixture('foreground-agent-api-retry.ndjson', 'transcripts').flatMap(e => harness.translate(e));
    const metadata = events.filter(e => e.type === 'thread/extensionState/updated' && e.kind === 'claude-code-telemetry/usage');
    expect(metadata.length).toBeGreaterThan(5);
    const ids = metadata.flatMap(e => e.type === 'thread/extensionState/updated' && e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload) && e.payload.source === 'request' ? [e.payload.messageId] : []);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
