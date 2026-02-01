'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore, Platform } from '@/lib/store';
import { PLATFORM_NAMES } from '@/lib/prompts';
import { NoteCardTemplate, NoteCardData } from './NoteCardTemplate';
import {
  generateImageFromElement,
  downloadImage,
  copyImageToClipboard,
} from '@/lib/generate-image';

interface TransformResultProps {
  content: string;
  images?: string[];
  onClose: () => void;
}

type OutputLength = 'concise' | 'normal' | 'detailed';

interface PlatformResult {
  text: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  length: OutputLength;
}

const platforms: Platform[] = ['twitter', 'xiaohongshu', 'wechat', 'linkedin'];

export function TransformResult({
  content,
  images = [],
  onClose,
}: TransformResultProps) {
  const { profile } = useStore();

  // Platform results
  const [platformResults, setPlatformResults] = useState<Record<Platform, PlatformResult>>({
    twitter: { text: null, isLoading: false, isStreaming: false, length: 'normal' },
    xiaohongshu: { text: null, isLoading: false, isStreaming: false, length: 'normal' },
    wechat: { text: null, isLoading: false, isStreaming: false, length: 'normal' },
    linkedin: { text: null, isLoading: false, isStreaming: false, length: 'normal' },
  });
  const [activePlatform, setActivePlatform] = useState<Platform>('twitter');
  const [copiedText, setCopiedText] = useState(false);
  const [prefetchStarted, setPrefetchStarted] = useState(false);

  // Image tab state
  const [noteData, setNoteData] = useState<NoteCardData | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Editable note data
  const [editableTitle, setEditableTitle] = useState('');
  const [editablePoints, setEditablePoints] = useState<string[]>([]);

  // Anime image state
  const [animeImage, setAnimeImage] = useState<string | null>(null);
  const [animePrompt, setAnimePrompt] = useState<string | null>(null);
  const [isGeneratingAnime, setIsGeneratingAnime] = useState(false);
  const [animeError, setAnimeError] = useState<string | null>(null);

  const noteCardRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Streaming transform for active platform
  const handleStreamingTransform = useCallback(async (platform: Platform, length: OutputLength) => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setPlatformResults((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], isLoading: true, isStreaming: true, length, text: '' },
    }));

    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, profile, platform, length, stream: true }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Transform failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setPlatformResults((prev) => ({
                ...prev,
                [platform]: { ...prev[platform], isLoading: false, isStreaming: false },
              }));
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setPlatformResults((prev) => ({
                  ...prev,
                  [platform]: { ...prev[platform], text: accumulatedText },
                }));
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      setPlatformResults((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], isLoading: false, isStreaming: false },
      }));
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Streaming transform failed:', error);
      setPlatformResults((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], isLoading: false, isStreaming: false },
      }));
    }
  }, [content, profile]);

  // Non-streaming transform for background prefetch
  const handleBackgroundTransform = useCallback(async (platform: Platform, length: OutputLength) => {
    // Skip if already loaded or loading
    const current = platformResults[platform];
    if (current.text || current.isLoading) return;

    setPlatformResults((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], isLoading: true, length },
    }));

    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, profile, platform, length, stream: false }),
      });
      const data = await response.json();
      setPlatformResults((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], text: data.result || null, isLoading: false },
      }));
    } catch (error) {
      console.error('Background transform failed:', error);
      setPlatformResults((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], isLoading: false },
      }));
    }
  }, [content, profile, platformResults]);

  // Background prefetch other platforms
  const startBackgroundPrefetch = useCallback(() => {
    if (prefetchStarted) return;
    setPrefetchStarted(true);

    // Prefetch other platforms with a small delay between each
    const otherPlatforms = platforms.filter((p) => p !== 'twitter');
    otherPlatforms.forEach((platform, index) => {
      setTimeout(() => {
        handleBackgroundTransform(platform, 'normal');
      }, (index + 1) * 500); // Stagger by 500ms
    });
  }, [prefetchStarted, handleBackgroundTransform]);

  // Auto-load Twitter on mount with streaming
  useEffect(() => {
    handleStreamingTransform('twitter', 'normal');

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start background prefetch when Twitter finishes loading
  useEffect(() => {
    if (platformResults.twitter.text && !platformResults.twitter.isLoading && !prefetchStarted) {
      startBackgroundPrefetch();
    }
  }, [platformResults.twitter.text, platformResults.twitter.isLoading, prefetchStarted, startBackgroundPrefetch]);

  const handlePlatformTabChange = (platform: Platform) => {
    setActivePlatform(platform);
    // Auto-load with streaming if not loaded yet
    if (!platformResults[platform].text && !platformResults[platform].isLoading) {
      handleStreamingTransform(platform, platformResults[platform].length);
    }
  };

  const handleLengthChange = (platform: Platform, length: OutputLength) => {
    setPlatformResults((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], length },
    }));
    handleStreamingTransform(platform, length);
  };

  const handleExtractPoints = async () => {
    setIsImageLoading(true);
    try {
      const response = await fetch('/api/extract-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (data.title && data.points) {
        setNoteData(data);
        setEditableTitle(data.title);
        setEditablePoints(data.points);
      }
    } catch (error) {
      console.error('Extract points failed:', error);
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!noteCardRef.current) return;
    setIsGeneratingImage(true);
    try {
      const dataUrl = await generateImageFromElement(noteCardRef.current, {
        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f4f1ea',
        scale: 2,
      });
      setGeneratedImage(dataUrl);
    } catch (error) {
      console.error('Generate image failed:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadImage = () => {
    if (generatedImage) {
      downloadImage(generatedImage, `note-${Date.now()}.png`);
    }
  };

  const handleCopyImage = async () => {
    if (generatedImage) {
      const success = await copyImageToClipboard(generatedImage);
      if (success) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
      }
    }
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const handleGenerateAnimeImage = async () => {
    setIsGeneratingAnime(true);
    setAnimeError(null);
    try {
      const response = await fetch('/api/generate-anime-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (data.error) {
        setAnimeError(data.details || data.error);
        // Still show prompt if available
        if (data.prompt) setAnimePrompt(data.prompt);
      } else if (data.image) {
        setAnimePrompt(data.prompt);
        setAnimeImage(data.image);
      } else {
        setAnimeError('图片生成失败，请稍后再试');
        if (data.prompt) setAnimePrompt(data.prompt);
      }
    } catch (error) {
      console.error('Generate anime image failed:', error);
      setAnimeError('网络错误，请检查连接后重试');
    } finally {
      setIsGeneratingAnime(false);
    }
  };

  const handleDownloadAnimeImage = () => {
    if (animeImage) {
      downloadImage(animeImage, `anime-${Date.now()}.png`);
    }
  };

  const handleCopyAnimeImage = async () => {
    if (animeImage) {
      const success = await copyImageToClipboard(animeImage);
      if (success) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
      }
    }
  };

  const handleDownloadOriginalImage = (img: string, index: number) => {
    downloadImage(img, `original-${index + 1}.png`);
  };

  const updatePoint = (index: number, value: string) => {
    const newPoints = [...editablePoints];
    newPoints[index] = value;
    setEditablePoints(newPoints);
    setGeneratedImage(null);
  };

  const currentNoteData: NoteCardData = {
    title: editableTitle || noteData?.title || '',
    points: editablePoints.length > 0 ? editablePoints : noteData?.points || [],
    author: profile?.bio ? `@${profile.bio.slice(0, 20)}` : undefined,
  };

  const currentResult = platformResults[activePlatform];
  const versions = currentResult.text?.split('---').map((t) => t.trim()).filter(Boolean) || [];

  const getLengthDescription = (platform: Platform, length: OutputLength) => {
    if (length === 'concise') {
      return platform === 'twitter' ? '// 一句话精炼版' : '// 简短版本';
    }
    if (length === 'detailed') {
      return platform === 'twitter' ? '// Thread 形式' : '// 详细展开版';
    }
    return `// ${PLATFORM_NAMES[platform]} 标准长度`;
  };

  // Count loaded platforms for progress indicator
  const loadedCount = platforms.filter((p) => platformResults[p].text).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-[#f4f1ea]">
          <div className="flex items-center gap-3">
            <h2
              className="text-lg font-medium"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              // TRANSFORM OUTPUT
            </h2>
            {loadedCount < 4 && (
              <span
                className="text-xs text-gray-400"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                ({loadedCount}/4 platforms)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Main Tabs: TEXT / IMAGE */}
        <Tabs defaultValue="text" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b bg-[#f4f1ea] p-0">
            <TabsTrigger
              value="text"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2a2a2a] data-[state=active]:bg-transparent px-6 py-3"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              TEXT
            </TabsTrigger>
            <TabsTrigger
              value="image"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2a2a2a] data-[state=active]:bg-transparent px-6 py-3"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              onClick={() => !noteData && handleExtractPoints()}
            >
              IMAGE
            </TabsTrigger>
          </TabsList>

          {/* Text Tab with Platform Sub-tabs */}
          <TabsContent value="text" className="flex-1 flex flex-col overflow-hidden m-0">
            {/* Platform selector */}
            <div className="flex border-b bg-[#fffef9]">
              {platforms.map((platform) => {
                const result = platformResults[platform];
                return (
                  <button
                    key={platform}
                    onClick={() => handlePlatformTabChange(platform)}
                    className={`px-4 py-2 text-sm transition-colors relative ${
                      activePlatform === platform
                        ? 'bg-white border-b-2 border-[#2a2a2a] font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {PLATFORM_NAMES[platform]}
                    {result.text && !result.isLoading && (
                      <span className="ml-1 text-green-500">✓</span>
                    )}
                    {result.isLoading && !result.isStreaming && (
                      <span className="ml-1 text-gray-400 animate-pulse">...</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Platform content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Length selector */}
              <div className="mb-6">
                <label
                  className="text-sm text-gray-500 mb-2 block"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  output_length:
                </label>
                <div className="flex gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {(['concise', 'normal', 'detailed'] as const).map((len) => (
                    <button
                      key={len}
                      onClick={() => handleLengthChange(activePlatform, len)}
                      className={`px-4 py-2 border transition-colors ${
                        currentResult.length === len
                          ? 'bg-[#2a2a2a] text-white border-[#2a2a2a]'
                          : 'bg-transparent text-[#2a2a2a] border-[#d4cfc4] hover:border-[#2a2a2a]'
                      }`}
                    >
                      {len === 'concise' ? '简洁' : len === 'normal' ? '正常' : '详细'}
                    </button>
                  ))}
                </div>
                <p
                  className="text-xs text-gray-400 mt-2"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {getLengthDescription(activePlatform, currentResult.length)}
                </p>
              </div>

              {/* Streaming/Loading state */}
              {currentResult.isLoading && !currentResult.text ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-[#2a2a2a] border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    generating for {PLATFORM_NAMES[activePlatform]}...
                  </p>
                </div>
              ) : currentResult.text ? (
                <div className="space-y-4">
                  {/* Show streaming indicator if still streaming */}
                  {currentResult.isStreaming && (
                    <div
                      className="flex items-center gap-2 text-sm text-gray-400 mb-2"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      <span className="animate-pulse">●</span> streaming...
                    </div>
                  )}
                  {versions.map((version, index) => (
                    <div
                      key={index}
                      className="p-4 bg-[#fffef9] border-2 border-[#d4cfc4]"
                      style={{ boxShadow: '4px 4px 0 #d4cfc4' }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className="text-sm text-gray-500"
                          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          version_{index + 1}
                        </span>
                        <span
                          className="text-sm text-gray-400"
                          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          {version.length} chars
                        </span>
                      </div>
                      <p
                        className="whitespace-pre-wrap mb-3 text-[#2a2a2a]"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.8 }}
                      >
                        {version}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyText(version)}
                        className="border-[#2a2a2a] text-[#2a2a2a]"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        disabled={currentResult.isStreaming}
                      >
                        {copiedText ? 'COPIED ✓' : 'COPY'}
                      </Button>
                    </div>
                  ))}
                  {!currentResult.isStreaming && (
                    <div className="pt-4 border-t border-[#d4cfc4]">
                      <Button
                        variant="outline"
                        onClick={() => handleStreamingTransform(activePlatform, currentResult.length)}
                        className="border-[#2a2a2a] text-[#2a2a2a]"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        REGENERATE
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Button
                    onClick={() => handleStreamingTransform(activePlatform, currentResult.length)}
                    className="bg-[#2a2a2a] text-[#f4f1ea]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    GENERATE FOR {PLATFORM_NAMES[activePlatform].toUpperCase()}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Image Tab */}
          <TabsContent value="image" className="flex-1 overflow-y-auto p-6 m-0">
            {isImageLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-[#2a2a2a] border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-500" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  extracting points...
                </p>
              </div>
            ) : noteData ? (
              <div className="space-y-6">
                {/* Theme toggle */}
                <div className="flex gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  <button
                    onClick={() => {
                      setTheme('light');
                      setGeneratedImage(null);
                    }}
                    className={`px-4 py-2 border ${
                      theme === 'light'
                        ? 'bg-[#2a2a2a] text-white border-[#2a2a2a]'
                        : 'bg-transparent text-[#2a2a2a] border-[#d4cfc4]'
                    }`}
                  >
                    LIGHT
                  </button>
                  <button
                    onClick={() => {
                      setTheme('dark');
                      setGeneratedImage(null);
                    }}
                    className={`px-4 py-2 border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] text-white border-[#2a2a2a]'
                        : 'bg-transparent text-[#2a2a2a] border-[#d4cfc4]'
                    }`}
                  >
                    DARK
                  </button>
                </div>

                {/* Editable fields */}
                <div className="space-y-4">
                  <div>
                    <label
                      className="text-sm text-gray-500 mb-1 block"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      title
                    </label>
                    <input
                      type="text"
                      value={editableTitle}
                      onChange={(e) => {
                        setEditableTitle(e.target.value);
                        setGeneratedImage(null);
                      }}
                      className="w-full p-2 border-2 border-[#d4cfc4] bg-[#fffef9]"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-sm text-gray-500 mb-1 block"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      points
                    </label>
                    {editablePoints.map((point, index) => (
                      <input
                        key={index}
                        type="text"
                        value={point}
                        onChange={(e) => updatePoint(index, e.target.value)}
                        className="w-full p-2 border-2 border-[#d4cfc4] bg-[#fffef9] mb-2"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="flex justify-center">
                  <NoteCardTemplate ref={noteCardRef} data={currentNoteData} theme={theme} />
                </div>

                {/* Generated image preview */}
                {generatedImage && (
                  <div className="border-2 border-[#d4cfc4] p-4 bg-gray-100">
                    <p
                      className="text-sm text-gray-500 mb-2"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      generated_image:
                    </p>
                    <img
                      src={generatedImage}
                      alt="Generated note card"
                      className="max-w-full mx-auto"
                    />
                  </div>
                )}

                {/* Actions */}
                <div
                  className="flex gap-3 flex-wrap"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  <Button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage}
                    className="bg-[#2a2a2a] text-[#f4f1ea]"
                  >
                    {isGeneratingImage ? 'GENERATING...' : 'GENERATE IMAGE'}
                  </Button>
                  {generatedImage && (
                    <>
                      <Button variant="outline" onClick={handleDownloadImage}>
                        DOWNLOAD
                      </Button>
                      <Button variant="outline" onClick={handleCopyImage}>
                        {copiedImage ? 'COPIED ✓' : 'COPY TO CLIPBOARD'}
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={handleExtractPoints}>
                    REGENERATE POINTS
                  </Button>
                </div>

                {/* Original images */}
                {images.length > 0 && (
                  <div className="border-t border-[#d4cfc4] pt-6">
                    <p
                      className="text-sm text-gray-500 mb-3"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      original_images:
                    </p>
                    <div className="flex gap-4 flex-wrap">
                      {images.map((img, index) => (
                        <div key={index} className="relative">
                          <img
                            src={img}
                            alt={`Original ${index + 1}`}
                            className="max-w-[200px] max-h-[150px] border-2 border-[#d4cfc4]"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full"
                            onClick={() => handleDownloadOriginalImage(img, index)}
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            DOWNLOAD
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anime illustration */}
                <div className="border-t border-[#d4cfc4] pt-6">
                  <p
                    className="text-sm text-gray-500 mb-3"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    anime_illustration:
                  </p>
                  <p
                    className="text-xs text-gray-400 mb-4"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    // 根据对话内容生成动漫风格配图 (DALL-E 3)
                  </p>

                  {animeError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
                      {animeError}
                    </div>
                  )}

                  {animeImage ? (
                    <div className="space-y-4">
                      {animePrompt && (
                        <div className="p-3 bg-[#f4f1ea] border border-[#d4cfc4] text-xs">
                          <span className="text-gray-500">prompt: </span>
                          <span className="text-gray-700">{animePrompt}</span>
                        </div>
                      )}
                      <img
                        src={animeImage}
                        alt="Generated anime illustration"
                        className="max-w-full rounded border-2 border-[#d4cfc4]"
                      />
                      <div className="flex gap-3" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        <Button variant="outline" onClick={handleDownloadAnimeImage}>
                          DOWNLOAD
                        </Button>
                        <Button variant="outline" onClick={handleCopyAnimeImage}>
                          {copiedImage ? 'COPIED ✓' : 'COPY'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleGenerateAnimeImage}
                          disabled={isGeneratingAnime}
                        >
                          REGENERATE
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={handleGenerateAnimeImage}
                      disabled={isGeneratingAnime}
                      className="bg-[#2a2a2a] text-[#f4f1ea]"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {isGeneratingAnime ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">◐</span> GENERATING...
                        </span>
                      ) : (
                        'GENERATE ANIME ILLUSTRATION'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p
                  className="text-gray-500 mb-4"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  extract key points from your conversation
                </p>
                <Button
                  onClick={handleExtractPoints}
                  className="bg-[#2a2a2a] text-[#f4f1ea]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  START
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
