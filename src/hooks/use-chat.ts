'use client';

import { useState, useCallback, useRef } from 'react';
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

      if (!response.ok) throw new Error(`Chat failed: ${response.status}`);

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
                throw new Error(typeof parsed.error === 'string' ? parsed.error : 'API error');
              }
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamingContent(accumulated);
              }
              if (parsed.research_spec) {
                setResearchSpec(parsed.research_spec);
              }
            } catch {
              // Skip malformed lines
            }
          }
        }
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        project_id: projectId,
        role: 'assistant',
        content: accumulated,
        metadata: {},
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
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
