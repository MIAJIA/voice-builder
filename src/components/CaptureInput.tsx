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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addCapture } = useStore();

  const handleImageUpload = useCallback(async (file: File) => {
    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.8,
        });
        setImage(compressed);
      } catch (error) {
        console.error('Failed to compress image:', error);
        setImage(event.target?.result as string);
      } finally {
        setIsCompressing(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleImageUpload]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleImageUpload(file);
        }
        break;
      }
    }
  }, [handleImageUpload]);

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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="relative mb-4">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && canStartChat && !isCompressing) {
              e.preventDefault();
              handleStartChat();
            }
          }}
          placeholder="输入你的想法，按 Enter 开始 Co-think"
          className="min-h-[120px] resize-none pr-12"
        />
        {/* Image upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute right-3 bottom-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="上传图片"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
      </div>

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
