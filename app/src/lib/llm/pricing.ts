/**
 * USD per million tokens. Verified against the Anthropic pricing table,
 * June 2026. Used for the daily spend cap and the cost readout.
 */
export const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5.0, output: 25.0 },
  'claude-sonnet-5': { input: 2.0, output: 10.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}
