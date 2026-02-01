'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useStore, Profile } from '@/lib/store';

type OnboardingStep = 0 | 1 | 2 | 3;

const toneOptions = [
  { value: 'casual', label: '轻松随意', description: '像和朋友聊天', emoji: '😊' },
  { value: 'professional', label: '专业正式', description: '商务或学术风格', emoji: '💼' },
  { value: 'humorous', label: '幽默风趣', description: '带点调侃和玩笑', emoji: '😄' },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { setProfile, setOnboardingCompleted } = useStore();

  const [step, setStep] = useState<OnboardingStep>(0);
  const [bio, setBio] = useState('');
  const [tone, setTone] = useState<Profile['tone']>('casual');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as OnboardingStep);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((step - 1) as OnboardingStep);
    }
  };

  const handleAddInterest = () => {
    const interest = interestInput.trim();
    if (interest && !interests.includes(interest)) {
      setInterests([...interests, interest]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const handleComplete = () => {
    // Save profile
    setProfile({
      bio,
      tone,
      avoidWords: [],
      interests,
    });
    setOnboardingCompleted(true);
    router.push('/');
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] flex items-center justify-center p-4">
      <Card className="w-full max-w-xl p-8 bg-[#fffef9] border-2 border-[#d4cfc4]" style={{ boxShadow: '8px 8px 0 #d4cfc4' }}>
        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded transition-colors ${
                i <= step ? 'bg-[#2a2a2a]' : 'bg-[#d4cfc4]'
              }`}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">✨</div>
            <h1
              className="text-2xl font-bold text-[#2a2a2a]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Welcome to Voice Builder
            </h1>
            <div className="space-y-4 text-[#2a2a2a]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <p className="text-lg">
                帮你找到自己的 <span className="font-bold">Voice</span>
              </p>
              <div className="bg-[#f4f1ea] p-4 rounded-lg text-left space-y-2">
                <p>💡 你不需要成为专家才能分享</p>
                <p>💡 你不需要 100% 确定才能发表</p>
                <p>💡 你的学习过程本身就有价值</p>
              </div>
              <p className="text-sm text-gray-500">
                让我们花 2 分钟，帮你建立你的 Voice Profile
              </p>
            </div>
            <div className="flex justify-between pt-4">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-gray-500"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                跳过
              </Button>
              <Button
                onClick={handleNext}
                className="bg-[#2a2a2a] text-[#f4f1ea] px-8"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                开始 →
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Who are you */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2
                className="text-xl font-bold text-[#2a2a2a] mb-2"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                你是谁？
              </h2>
              <p className="text-gray-500 text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                用一句话介绍自己，这会帮助 AI 更好地理解你的风格
              </p>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="比如：我是一个喜欢把复杂东西讲简单的产品经理"
              className="min-h-[100px] border-2 border-[#d4cfc4] bg-[#fffef9]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            />
            <div>
              <p className="text-sm text-gray-400 mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                示例：
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  '创业者，关注效率和成长',
                  '设计师，热爱简洁之美',
                  '工程师，喜欢深入原理',
                  '学生，正在探索世界',
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setBio(example)}
                    className="text-xs px-3 py-1 bg-[#f4f1ea] border border-[#d4cfc4] rounded hover:border-[#2a2a2a] transition-colors"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-[#d4cfc4]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                ← 返回
              </Button>
              <Button
                onClick={handleNext}
                className="bg-[#2a2a2a] text-[#f4f1ea]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                继续 →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Your Voice */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2
                className="text-xl font-bold text-[#2a2a2a] mb-2"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                你的 Voice 是什么风格？
              </h2>
              <p className="text-gray-500 text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                选择最符合你表达习惯的风格
              </p>
            </div>
            <div className="grid gap-3">
              {toneOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTone(option.value)}
                  className={`p-4 text-left border-2 transition-all ${
                    tone === option.value
                      ? 'border-[#2a2a2a] bg-[#f4f1ea]'
                      : 'border-[#d4cfc4] hover:border-[#2a2a2a]'
                  }`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-[#d4cfc4]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                ← 返回
              </Button>
              <Button
                onClick={handleNext}
                className="bg-[#2a2a2a] text-[#f4f1ea]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                继续 →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2
                className="text-xl font-bold text-[#2a2a2a] mb-2"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                你关注什么领域？
              </h2>
              <p className="text-gray-500 text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                添加你感兴趣的话题，帮助生成更相关的内容
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                placeholder="输入领域，按回车添加"
                className="flex-1 px-3 py-2 border-2 border-[#d4cfc4] bg-[#fffef9]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              />
              <Button
                variant="outline"
                onClick={handleAddInterest}
                className="border-[#d4cfc4]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[60px]">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-[#f4f1ea] border border-[#d4cfc4] text-sm cursor-pointer hover:bg-red-50 hover:border-red-300 transition-colors"
                  onClick={() => handleRemoveInterest(interest)}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {interest} ×
                </span>
              ))}
              {interests.length === 0 && (
                <span className="text-gray-400 text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  点击下方标签快速添加
                </span>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                热门领域：
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  '产品',
                  '技术',
                  '设计',
                  '创业',
                  '成长',
                  '效率',
                  '阅读',
                  '投资',
                  'AI',
                  '心理学',
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (!interests.includes(tag)) {
                        setInterests([...interests, tag]);
                      }
                    }}
                    disabled={interests.includes(tag)}
                    className={`text-xs px-3 py-1 border rounded transition-colors ${
                      interests.includes(tag)
                        ? 'bg-[#2a2a2a] text-white border-[#2a2a2a]'
                        : 'bg-[#f4f1ea] border-[#d4cfc4] hover:border-[#2a2a2a]'
                    }`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-[#d4cfc4]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                ← 返回
              </Button>
              <Button
                onClick={handleComplete}
                className="bg-[#2a2a2a] text-[#f4f1ea] px-8"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                完成设置 ✓
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
