'use client';

import { useStore, generateId } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function ConversationSidebar() {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    addConversation,
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

  return (
    <div className="w-64 bg-white border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b">
        <Button
          onClick={handleNewConversation}
          className="w-full"
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
              <button
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-l-2 ${
                  conv.id === currentConversationId
                    ? 'bg-blue-50 border-l-blue-500'
                    : 'border-l-transparent'
                }`}
              >
                <p className="text-sm text-gray-800 truncate">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
