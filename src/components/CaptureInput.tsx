'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useStore, generateId } from '@/lib/store';
import { compressImage } from '@/lib/image-utils';

interface CaptureInputProps {
  onStartChat: (text: string, image?: string) => void;
}

export function CaptureInput({ onStartChat }: CaptureInputProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { addCapture } = useStore();

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setIsCompressing(true);
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const base64 = event.target?.result as string;
              // Compress image before storing
              const compressed = await compressImage(base64, {
                maxWidth: 1024,
                maxHeight: 1024,
                quality: 0.8,
              });
              setImage(compressed);
            } catch (error) {
              console.error('Failed to compress image:', error);
              // Fall back to original if compression fails
              setImage(event.target?.result as string);
            } finally {
              setIsCompressing(false);
            }
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
    // Allow starting with text only, image only, or both
    if (!text.trim() && !image) return;
    onStartChat(text.trim(), image || undefined);
    setText('');
    setImage(null);
  };

  const removeImage = () => {
    setImage(null);
  };

  const canStartChat = text.trim() || image;

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

      {isCompressing && (
        <div className="mb-4 text-sm text-gray-500">压缩图片中...</div>
      )}

      {image && !isCompressing && (
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
          disabled={(!text.trim() && !image) || isCompressing}
        >
          保存草稿
        </Button>
        <Button
          onClick={handleStartChat}
          disabled={!canStartChat || isCompressing}
        >
          开始 Co-think →
        </Button>
      </div>
    </Card>
  );
}
