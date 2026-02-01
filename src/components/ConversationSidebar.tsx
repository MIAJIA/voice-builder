'use client';

import { useState } from 'react';
import { useStore, generateId } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function ConversationSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    addConversation,
    deleteConversation,
  } = useStore();

  // Get conversation preview text
  const getPreview = (conv: typeof conversations[0]) => {
    const firstUserMsg = conv.messages.find(m => m.role === 'user');
    if (firstUserMsg?.content) {
      return firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '');
    }
    if (firstUserMsg?.image) {
      return '📷 图片';
    }
    return '新对话';
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const handleNewConversation = () => {
    const newConversation = {
      id: generateId(),
      messages: [],
      timestamp: Date.now(),
    };
    addConversation(newConversation);
    setCurrentConversationId(newConversation.id);
  };

  // Collapsed view
  if (!isExpanded) {
    return (
      <div className="w-12 bg-white border-r flex flex-col h-full">
        <button
          onClick={() => setIsExpanded(true)}
          className="p-3 hover:bg-gray-50 border-b flex items-center justify-center"
          title="展开对话列表"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button
          onClick={handleNewConversation}
          className="p-3 hover:bg-gray-50 flex items-center justify-center text-gray-600"
          title="新对话"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        {conversations.length > 0 && (
          <div className="flex-1 flex items-start justify-center pt-2">
            <span className="text-xs text-gray-400 writing-vertical">{conversations.length}</span>
          </div>
        )}
      </div>
    );
  }

  // Expanded view
  return (
    <div className="w-64 bg-white border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-gray-100 rounded"
          title="收起"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <Button
          onClick={handleNewConversation}
          className="flex-1"
          size="sm"
        >
          + 新对话
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            暂无对话
          </div>
        ) : (
          <div className="py-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-l-2 ${
                  conv.id === currentConversationId
                    ? 'bg-blue-50 border-l-blue-500'
                    : 'border-l-transparent'
                }`}
              >
                <button
                  onClick={() => setCurrentConversationId(conv.id)}
                  className="w-full text-left"
                >
                  <p className="text-sm text-gray-800 truncate pr-6">
                    {getPreview(conv)}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400">
                      {conv.messages.length} 条
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(conv.timestamp)}
                    </span>
                  </div>
                </button>
                {/* Delete button - shows on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定删除这个对话吗？')) {
                      deleteConversation(conv.id);
                    }
                  }}
                  className="absolute right-2 top-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded text-gray-400 hover:text-red-500 transition-all"
                  title="删除对话"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
