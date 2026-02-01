'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { VoiceReminder } from './VoiceReminder';
import { useStore, generateId, Message } from '@/lib/store';
import { fetchEventSource } from '@microsoft/fetch-event-source';

interface ChatInterfaceProps {
  initialText?: string;
  onTransform?: (content: string) => void;
}

export function ChatInterface({ initialText, onTransform }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    profile,
    currentConversationId,
    conversations,
    addConversation,
    addMessageToCurrentConversation,
    updateLastAssistantMessage,
  } = useStore();

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );
  const messages = currentConversation?.messages || [];

  // Initialize conversation with initial text
  useEffect(() => {
    if (initialText && !currentConversationId) {
      const newConversation = {
        id: generateId(),
        messages: [],
        timestamp: Date.now(),
      };
      addConversation(newConversation);
      // Send initial message after a short delay
      setTimeout(() => {
        handleSendMessage(initialText);
      }, 100);
    }
  }, [initialText]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText.trim() };
    addMessageToCurrentConversation(userMessage);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    // Add placeholder for assistant message
    addMessageToCurrentConversation({ role: 'assistant', content: '' });

    const allMessages = [...messages, userMessage];

    try {
      let fullContent = '';

      await fetchEventSource('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: allMessages,
          profile,
        }),
        onmessage(event) {
          if (event.data === '[DONE]') {
            return;
          }
          try {
            const data = JSON.parse(event.data);
            if (data.text) {
              fullContent += data.text;
              setStreamingContent(fullContent);
              updateLastAssistantMessage(fullContent);
            }
          } catch {
            // Ignore parse errors
          }
        },
        onerror(error) {
          console.error('SSE error:', error);
          throw error;
        },
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      updateLastAssistantMessage('抱歉，发生了错误，请重试。');
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTransform = () => {
    // Collect all user messages as the content to transform
    const userContent = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n\n');

    const assistantSummary = messages
      .filter((m) => m.role === 'assistant')
      .slice(-1)[0]?.content;

    const contentToTransform = assistantSummary
      ? `用户原始想法：\n${userContent}\n\nAI 总结：\n${assistantSummary}`
      : userContent;

    onTransform?.(contentToTransform);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Voice Reminder */}
      <div className="mb-4">
        <VoiceReminder />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-2">开始你的想法采访</p>
            <p className="text-sm">输入你想分享的想法，我会帮你把它变得更清晰</p>
          </div>
        )}

        {messages.map((message, index) => (
          <Card
            key={index}
            className={`p-4 ${
              message.role === 'user'
                ? 'bg-blue-50 border-blue-100 ml-8'
                : 'bg-gray-50 border-gray-100 mr-8'
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">
              {message.role === 'user' ? '你' : 'AI 采访者'}
            </div>
            <div className="whitespace-pre-wrap">
              {message.content ||
                (isLoading && index === messages.length - 1 ? (
                  <span className="text-gray-400">思考中...</span>
                ) : null)}
            </div>
          </Card>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的想法..."
            className="flex-1 min-h-[80px] resize-none"
            disabled={isLoading}
          />
        </div>
        <div className="flex justify-between mt-3">
          <Button
            variant="outline"
            onClick={handleTransform}
            disabled={messages.length < 2}
          >
            转换为 Twitter
          </Button>
          <Button onClick={() => handleSendMessage()} disabled={isLoading || !input.trim()}>
            {isLoading ? '思考中...' : '发送'}
          </Button>
        </div>
      </div>
    </div>
  );
}
