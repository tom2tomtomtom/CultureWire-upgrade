'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './message-bubble';
import { StreamingMessage } from './streaming-message';
import { PdfUpload } from './pdf-upload';
import { useChat } from '@/hooks/use-chat';

interface ChatInterfaceProps {
  projectId: string;
  onSpecGenerated?: () => void;
}

export function ChatInterface({ projectId, onSpecGenerated }: ChatInterfaceProps) {
  const {
    messages,
    isStreaming,
    streamingContent,
    researchSpec,
    sendMessage,
    cancel,
    loadMessages,
  } = useChat(projectId);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (researchSpec && onSpecGenerated) {
      onSpecGenerated();
    }
  }, [researchSpec, onSpecGenerated]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    sendMessage(trimmed);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isEmpty ? (
        /* Empty state: center everything vertically */
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="w-full max-w-2xl space-y-4">
            <PdfUpload
              projectId={projectId}
              onUploadComplete={(text) => {
                sendMessage(
                  `I've uploaded a brief document. Here's a summary of what I need researched:\n\n${text.slice(0, 2000)}`
                );
              }}
            />
            <p className="text-center text-sm text-muted-foreground">
              or start with a prompt
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                'How do Gen Z consumers talk about skincare on Reddit and TikTok?',
                'What are the top complaints about meal kit delivery services?',
                'Research competitor sentiment for electric vehicle brands in the UK',
                'Find trending conversations about AI tools in creative industries',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="rounded-lg border border-border bg-muted/30 p-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="pt-4">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your research needs..."
                  className="min-h-[80px] resize-none"
                  disabled={isStreaming}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    size="icon"
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Conversation state: scrollable messages + input at bottom */
        <>
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {isStreaming && streamingContent && (
                <StreamingMessage content={streamingContent} />
              )}
            </div>
          </ScrollArea>

          <div className="border-t pt-4">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your research needs..."
                className="min-h-[80px] resize-none"
                disabled={isStreaming}
              />
              <div className="flex flex-col gap-2">
                {isStreaming ? (
                  <Button variant="destructive" size="icon" onClick={cancel}>
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
