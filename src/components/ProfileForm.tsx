'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStore, Profile, Platform, PlatformPersona } from '@/lib/store';
import { PLATFORM_NAMES, PLATFORM_DEFAULTS } from '@/lib/prompts';
import { PersonaSetupDialog } from './PersonaSetupDialog';

const toneOptions = [
  { value: 'casual', label: '轻松随意', description: '像和朋友聊天' },
  { value: 'professional', label: '专业正式', description: '商务或学术风格' },
  { value: 'humorous', label: '幽默风趣', description: '带点调侃和玩笑' },
] as const;

export function ProfileForm() {
  const { profile, setProfile } = useStore();

  const [bio, setBio] = useState(profile?.bio || '');
  const [tone, setTone] = useState<Profile['tone']>(profile?.tone || 'casual');
  const [avoidWordsInput, setAvoidWordsInput] = useState('');
  const [avoidWords, setAvoidWords] = useState<string[]>(
    profile?.avoidWords || []
  );
  const [interestsInput, setInterestsInput] = useState('');
  const [interests, setInterests] = useState<string[]>(
    profile?.interests || []
  );
  const [platformPersonas, setPlatformPersonas] = useState<Profile['platformPersonas']>(
    profile?.platformPersonas || {}
  );
  const [setupPlatform, setSetupPlatform] = useState<Platform | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio);
      setTone(profile.tone);
      setAvoidWords(profile.avoidWords);
      setInterests(profile.interests);
      setPlatformPersonas(profile.platformPersonas || {});
    }
  }, [profile]);

  const handleAddAvoidWord = () => {
    const word = avoidWordsInput.trim();
    if (word && !avoidWords.includes(word)) {
      setAvoidWords([...avoidWords, word]);
      setAvoidWordsInput('');
    }
  };

  const handleRemoveAvoidWord = (word: string) => {
    setAvoidWords(avoidWords.filter((w) => w !== word));
  };

  const handleAddInterest = () => {
    const interest = interestsInput.trim();
    if (interest && !interests.includes(interest)) {
      setInterests([...interests, interest]);
      setInterestsInput('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const handleSave = () => {
    setProfile({
      bio,
      tone,
      avoidWords,
      interests,
      platformPersonas,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSavePersona = (platform: Platform, persona: PlatformPersona) => {
    const newPersonas = { ...platformPersonas, [platform]: persona };
    setPlatformPersonas(newPersonas);
    setSetupPlatform(null);
    // Auto-save
    setProfile({
      bio,
      tone,
      avoidWords,
      interests,
      platformPersonas: newPersonas,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeletePersona = (platform: Platform) => {
    const newPersonas = { ...platformPersonas };
    delete newPersonas[platform];
    setPlatformPersonas(newPersonas);
  };

  const platforms: Platform[] = ['twitter', 'xiaohongshu', 'wechat', 'linkedin'];

  const handleKeyDown = (
    e: React.KeyboardEvent,
    handler: () => void
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handler();
    }
  };

  return (
    <div className="space-y-6">
      {/* Coming soon notice */}
      <Card className="bg-purple-50 border-purple-200 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✨</span>
          <div>
            <h3 className="font-medium text-purple-800">下阶段更新预告</h3>
            <p className="text-sm text-purple-700 mt-1">
              未来版本将支持自动学习你的表达风格，根据你的对话历史自动更新 Profile。
            </p>
          </div>
        </div>
      </Card>

      {/* Bio */}
      <Card className="p-6">
        <h3 className="font-medium mb-3">个人简介</h3>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="简单介绍一下你自己，比如：我是一个喜欢把复杂东西讲简单的产品经理"
          className="min-h-[80px]"
        />
      </Card>

      {/* Tone */}
      <Card className="p-6">
        <h3 className="font-medium mb-3">语气风格</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {toneOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTone(option.value)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                tone === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-gray-500 mt-1">
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Avoid Words */}
      <Card className="p-6">
        <h3 className="font-medium mb-3">避免使用的词汇</h3>
        <p className="text-sm text-gray-500 mb-3">
          添加你不想在输出中看到的词汇，比如：赋能、抓手、闭环
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            value={avoidWordsInput}
            onChange={(e) => setAvoidWordsInput(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAddAvoidWord)}
            placeholder="输入词汇，按回车添加"
            className="flex-1"
          />
          <Button variant="outline" onClick={handleAddAvoidWord}>
            添加
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {avoidWords.map((word) => (
            <Badge
              key={word}
              variant="secondary"
              className="cursor-pointer hover:bg-red-100"
              onClick={() => handleRemoveAvoidWord(word)}
            >
              {word} ×
            </Badge>
          ))}
          {avoidWords.length === 0 && (
            <span className="text-sm text-gray-400">暂无</span>
          )}
        </div>
      </Card>

      {/* Interests */}
      <Card className="p-6">
        <h3 className="font-medium mb-3">感兴趣的领域</h3>
        <div className="flex gap-2 mb-3">
          <Input
            value={interestsInput}
            onChange={(e) => setInterestsInput(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAddInterest)}
            placeholder="输入领域，按回车添加"
            className="flex-1"
          />
          <Button variant="outline" onClick={handleAddInterest}>
            添加
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <Badge
              key={interest}
              variant="secondary"
              className="cursor-pointer hover:bg-red-100"
              onClick={() => handleRemoveInterest(interest)}
            >
              {interest} ×
            </Badge>
          ))}
          {interests.length === 0 && (
            <span className="text-sm text-gray-400">暂无</span>
          )}
        </div>
      </Card>

      {/* Platform Personas */}
      <Card className="p-6">
        <h3 className="font-medium mb-3">平台人设</h3>
        <p className="text-sm text-gray-500 mb-4">
          为不同平台设置专属人设，输出内容时会根据平台调整风格
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => {
            const persona = platformPersonas?.[platform];
            const defaults = PLATFORM_DEFAULTS[platform];
            const name = PLATFORM_NAMES[platform];

            return (
              <div
                key={platform}
                className={`p-4 rounded-lg border ${
                  persona?.isCustom
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{name}</div>
                  <Badge variant={persona?.isCustom ? 'default' : 'secondary'}>
                    {persona?.isCustom ? '已定制' : '默认'}
                  </Badge>
                </div>
                {persona?.isCustom ? (
                  <div className="text-sm text-gray-600 mb-3">
                    <p className="line-clamp-2">{persona.platformBio}</p>
                    <p className="text-xs text-gray-400 mt-1">{persona.tone}</p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mb-3">
                    <p>语气: {defaults.tone}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSetupPlatform(platform)}
                  >
                    {persona?.isCustom ? '修改' : '设置'}
                  </Button>
                  {persona?.isCustom && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeletePersona(platform)}
                    >
                      重置
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="min-w-[120px]">
          {saved ? '已保存 ✓' : '保存设置'}
        </Button>
      </div>

      {/* Persona Setup Dialog */}
      {setupPlatform && (
        <PersonaSetupDialog
          platform={setupPlatform}
          currentPersona={platformPersonas?.[setupPlatform]}
          onSave={(persona) => handleSavePersona(setupPlatform, persona)}
          onClose={() => setSetupPlatform(null)}
        />
      )}
    </div>
  );
}
