'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useStore, generateId } from '@/lib/store';

interface CaptureInputProps {
  onStartChat: (text: string) => void;
}

export function CaptureInput({ onStartChat }: CaptureInputProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { addCapture } = useStore();

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setImage(base64);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  const handleSaveCapture = () => {
    if (!text.trim() && !image) return;

    const capture = {
      id: generateId(),
      text: text.trim(),
      image: image || undefined,
      timestamp: Date.now(),
    };

    addCapture(capture);
    setText('');
    setImage(null);
  };

  const handleStartChat = () => {
    if (!text.trim()) return;
    onStartChat(text.trim());
    setText('');
    setImage(null);
  };

  const removeImage = () => {
    setImage(null);
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">捕捉你的想法</h2>

      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        placeholder="输入你的想法... (可以直接粘贴图片)"
        className="min-h-[120px] resize-none mb-4"
      />

      {image && (
        <div className="relative mb-4 inline-block">
          <img
            src={image}
            alt="Pasted"
            className="max-w-full max-h-48 rounded-lg border"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleSaveCapture}
          disabled={!text.trim() && !image}
        >
          保存草稿
        </Button>
        <Button onClick={handleStartChat} disabled={!text.trim()}>
          开始 Co-think →
        </Button>
      </div>
    </Card>
  );
}
