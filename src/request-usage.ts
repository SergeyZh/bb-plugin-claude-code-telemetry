import { z } from 'zod';
import {
  addTokenUsage, ZERO_TOKEN_USAGE,
  type ThreadDelta, type ThreadEventTokenUsageBreakdown,
} from '@get-bb/plugin-sdk/provider-bridge';

export const usageMetadataSchema = z.object({
  source: z.enum(['request', 'aggregate-remainder']), messageId: z.string().nullable(),
  model: z.string().nullable(), incomplete: z.boolean(),
  counts: z.record(z.string(), z.number().nonnegative()),
});

const tokens = z.number().int().nonnegative().safe();
const assistantUsage = z.object({
  id: z.string().min(1), model: z.string().optional(),
  usage: z.object({
    input_tokens: tokens, output_tokens: tokens,
    cache_read_input_tokens: tokens, cache_creation_input_tokens: tokens,
    cache_creation: z.object({ ephemeral_1h_input_tokens: tokens.optional(), ephemeral_5m_input_tokens: tokens.optional() }).nullish(),
  }),
});
const fields = ['inputTokens', 'outputTokens', 'cachedInputTokens', 'cacheReadInputTokens', 'cacheWriteInputTokens', 'reasoningOutputTokens', 'totalTokens'] as const;
type Breakdown = ThreadEventTokenUsageBreakdown;

export class ClaudeRequestUsage {
  private seen = new Set<string>();
  private pending: { id: string; model?: string; counts: Breakdown; ttl?: number } | undefined;
  private turn: Breakdown = ZERO_TOKEN_USAGE;

  resetTurn() {
    this.seen.clear();
    this.pending = undefined;
    this.turn = ZERO_TOKEN_USAGE;
  }

  observe(message: unknown, total: Breakdown, contextWindow: number | null): ThreadDelta[] {
    const parsed = assistantUsage.safeParse(message);
    if (!parsed.success || this.seen.has(parsed.data.id)) return [];
    const { id, model, usage } = parsed.data;
    if (model === '<synthetic>') return [];
    const deltas = this.pending && this.pending.id !== id ? this.flush(total, contextWindow) : [];
    const read = usage.cache_read_input_tokens;
    const write = usage.cache_creation_input_tokens;
    const counts: Breakdown = {
      inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
      cachedInputTokens: read + write, cacheReadInputTokens: read, cacheWriteInputTokens: write,
      totalTokens: usage.input_tokens + usage.output_tokens + read + write, reasoningOutputTokens: 0,
    };
    if (this.pending?.id === id) {
      for (const field of fields) counts[field] = Math.max(counts[field] ?? 0, this.pending.counts[field] ?? 0);
    }
    const ttl = (usage.cache_creation?.ephemeral_1h_input_tokens ?? 0) > 0 ? 3_600_000
      : (usage.cache_creation?.ephemeral_5m_input_tokens ?? 0) > 0 ? 300_000 : this.pending?.ttl;
    this.pending = { id, model, counts, ttl };
    return deltas;
  }

  flush(total: Breakdown, contextWindow: number | null, incomplete = false): ThreadDelta[] {
    const pending = this.pending;
    if (!pending) return [];
    this.pending = undefined;
    this.seen.add(pending.id);
    this.turn = addTokenUsage(this.turn, pending.counts);
    return this.report(total, pending.counts, contextWindow, {
      source: 'request', messageId: pending.id, model: pending.model ?? null, incomplete,
    }, pending.ttl);
  }

  reconcile(total: Breakdown, aggregate: Breakdown, contextWindow: number | null, ttl?: number): ThreadDelta[] {
    const residual = { ...aggregate };
    for (const field of fields) {
      const reported = aggregate[field];
      if (reported !== undefined) residual[field] = Math.max(0, reported - (this.turn[field] ?? 0));
    }
    residual.cachedInputTokens = Math.max(residual.cachedInputTokens, (residual.cacheReadInputTokens ?? 0) + (residual.cacheWriteInputTokens ?? 0));
    residual.totalTokens = residual.inputTokens + residual.outputTokens + residual.cachedInputTokens;
    if (this.seen.size > 0 && !fields.some(field => (residual[field] ?? 0) > 0)) return [];
    return this.report(total, residual, contextWindow, { source: 'aggregate-remainder', messageId: null, model: null, incomplete: true }, ttl);
  }

  private report(total: Breakdown, last: Breakdown, modelContextWindow: number | null, metadata: Record<string, string | boolean | null>, ttl?: number): ThreadDelta[] {
    return [
      { kind: 'extension.state', extensionKind: 'claude-code-telemetry/usage', payload: { ...metadata, counts: last } },
      { kind: 'usage', total: addTokenUsage(total, last), last, modelContextWindow,
        ...(ttl === undefined ? {} : { promptCacheTtlMs: ttl }) },
    ];
  }
}
