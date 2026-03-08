import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return client;
}

/** Model fallback order: try Sonnet first, fall back to Haiku on overload/529. */
export const MODEL_FALLBACK_ORDER = [
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
] as const;

const MAX_INPUT_CHARS = 500_000; // ~125k tokens, safe under 200k context limit

function isOverloadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('overloaded') || msg.includes('529') || msg.includes('rate');
}

/**
 * Call Anthropic with automatic model fallback on overload/529 errors.
 * Non-streaming only. For streaming, use MODEL_FALLBACK_ORDER with your own loop.
 */
export async function callAnthropicWithFallback(
  system: string,
  userContent: string,
  maxTokens = 8192,
): Promise<string> {
  const anthropic = getAnthropicClient();

  // Safety truncation to prevent token limit errors
  const truncatedContent =
    userContent.length > MAX_INPUT_CHARS
      ? userContent.slice(0, MAX_INPUT_CHARS) + '\n\n[TRUNCATED - data exceeded size limit]'
      : userContent;

  for (let i = 0; i < MODEL_FALLBACK_ORDER.length; i++) {
    const model = MODEL_FALLBACK_ORDER[i];
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: truncatedContent }],
      });

      return response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
    } catch (err: unknown) {
      if (isOverloadError(err) && i < MODEL_FALLBACK_ORDER.length - 1) {
        console.log(`[anthropic] ${model} overloaded, falling back to ${MODEL_FALLBACK_ORDER[i + 1]}`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('All models failed');
}
