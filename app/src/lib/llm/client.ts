import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { costUsd } from './pricing';

/**
 * Thin wrapper over the Anthropic SDK.
 *
 * Deliberately has no 'server-only' import and no database dependency, because
 * it is used both from Next route handlers and from plain `tsx` scripts.
 * Metering is injected via `onUsage` so each caller records it its own way.
 */

export type Model = 'claude-opus-5' | 'claude-sonnet-5' | 'claude-haiku-4-5';

export type Purpose =
  | 'generate' | 'aic-assistant' | 'aic-score' | 'essay-grade' | 'speech-feedback';

export interface Usage {
  purpose: Purpose;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export class LlmUnavailableError extends Error {
  constructor(public readonly reason: 'no-key' | 'cap-exceeded', message: string) {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!hasApiKey()) {
    throw new LlmUnavailableError(
      'no-key',
      'ANTHROPIC_API_KEY is not set. Assisted features fall back to deterministic rubric scoring.',
    );
  }
  client ??= new Anthropic();
  return client;
}

export interface ParseOptions<T extends z.ZodType> {
  purpose: Purpose;
  model?: Model;
  system: string;
  prompt: string;
  schema: T;
  maxTokens?: number;
  /** Aborts before spending if the cap is already reached. */
  spentTodayUsd?: number;
  capUsd?: number;
  onUsage?: (usage: Usage) => void;
}

/**
 * One structured call. Uses the SDK's `parse` helper so the response is
 * schema-validated by the API rather than by hope-and-JSON.parse.
 */
export async function parseStructured<T extends z.ZodType>({
  purpose,
  model = 'claude-opus-5',
  system,
  prompt,
  schema,
  maxTokens = 16000,
  spentTodayUsd = 0,
  capUsd = Number(process.env.LLM_DAILY_CAP_USD ?? '2'),
  onUsage,
}: ParseOptions<T>): Promise<z.infer<T>> {
  if (capUsd > 0 && spentTodayUsd >= capUsd) {
    throw new LlmUnavailableError(
      'cap-exceeded',
      `Daily LLM cap of $${capUsd} reached ($${spentTodayUsd.toFixed(2)} spent). ` +
        'Raise LLM_DAILY_CAP_USD or wait until tomorrow.',
    );
  }

  const response = await getClient().messages.parse({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: zodOutputFormat(schema) },
  });

  onUsage?.({
    purpose,
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    costUsd: costUsd(model, response.usage.input_tokens, response.usage.output_tokens),
  });

  // parsed_output is null when the model could not satisfy the schema.
  if (response.parsed_output == null) {
    throw new Error(
      `Model returned output that did not match the schema (stop_reason: ${response.stop_reason}).`,
    );
  }
  return response.parsed_output;
}
