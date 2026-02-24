'use client';

import { useState, useCallback, useRef } from 'react';

export function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (url: string, body: Record<string, unknown>) => {
    abortRef.current = new AbortController();
    setIsStreaming(true);
    setStreamedContent('');

    let accumulated = '';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamedContent(accumulated);
              }
              if (parsed.research_spec) {
                // Will be handled by caller
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled
      } else {
        throw error;
      }
    } finally {
      setIsStreaming(false);
    }

    return accumulated;
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { isStreaming, streamedContent, startStream, cancel };
}
