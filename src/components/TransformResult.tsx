'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStore } from '@/lib/store';

interface TransformResultProps {
  content: string;
  onClose: () => void;
}

export function TransformResult({ content, onClose }: TransformResultProps) {
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { profile } = useStore();

  const handleTransform = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          profile,
        }),
      });

      const data = await response.json();
      if (data.result) {
        setResult(data.result);
      }
    } catch (error) {
      console.error('Transform failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  // Auto-transform on mount
  useState(() => {
    handleTransform();
  });

  const tweetVersions = result?.split('---').map((t) => t.trim()) || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Twitter 推文</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">正在生成推文...</p>
          </div>
        ) : result ? (
          <div className="space-y-4">
            {tweetVersions.map((tweet, index) => (
              <Card key={index} className="p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-500">
                    版本 {index + 1}
                  </span>
                  <span className="text-sm text-gray-400">
                    {tweet.length} 字符
                  </span>
                </div>
                <p className="whitespace-pre-wrap mb-3">{tweet}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(tweet)}
                >
                  {copied ? '已复制 ✓' : '复制'}
                </Button>
              </Card>
            ))}

            <div className="pt-4 border-t">
              <Button variant="outline" onClick={handleTransform}>
                重新生成
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">准备将你的想法转换为推文</p>
            <Button onClick={handleTransform}>开始转换</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
