'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { ChatMessage, ResearchSpec } from '@/lib/types';

export function useChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [researchSpec, setResearchSpec] = useState<ResearchSpec | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // Silent fail on load
    }
  }, [projectId]);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message locally
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      project_id: projectId,
      role: 'user',
      content,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent('');

    abortRef.current = new AbortController();
    let accumulated = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message: content }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[chat] API error:', response.status, errBody);
        throw new Error(`Chat failed: ${response.status} - ${errBody}`);
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
              if (parsed.error) {
                const errMsg = typeof parsed.error === 'string' ? parsed.error : 'API error';
                if (errMsg.includes('credit balance') || errMsg.includes('billing')) {
                  toast.error('API credits exhausted', {
                    description: 'The AI service has run out of credits. Please contact your administrator to top up.',
                    duration: 10000,
                  });
                } else {
                  toast.error('Research failed', { description: errMsg });
                }
                throw new Error(errMsg);
              }
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamingContent(accumulated);
              }
              if (parsed.research_spec) {
                setResearchSpec(parsed.research_spec);
              }
            } catch (parseErr) {
              // Re-throw if it's our own error from above
              if (parseErr instanceof Error && parseErr.message !== 'Unexpected token') {
                throw parseErr;
              }
              // Skip genuinely malformed JSON lines
            }
          }
        }
      }

      // Add assistant message
      if (accumulated) {
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          project_id: projectId,
          role: 'assistant',
          content: accumulated,
          metadata: {},
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('[chat] Send error:', error);
      if ((error as Error).name !== 'AbortError') {
        const errMsg = (error as Error).message || 'Something went wrong';
        if (!errMsg.includes('credit balance')) {
          toast.error('Chat error', { description: errMsg });
        }
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          project_id: projectId,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          metadata: { error: true },
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [projectId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    researchSpec,
    sendMessage,
    cancel,
    loadMessages,
    setMessages,
  };
}
