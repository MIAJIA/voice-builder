'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Platform, PlatformPersona } from '@/lib/store';
import { PERSONA_QUESTIONS, PLATFORM_NAMES } from '@/lib/prompts';

interface PersonaSetupDialogProps {
  platform: Platform;
  currentPersona?: PlatformPersona;
  onSave: (persona: PlatformPersona) => void;
  onClose: () => void;
}

export function PersonaSetupDialog({
  platform,
  currentPersona,
  onSave,
  onClose,
}: PersonaSetupDialogProps) {
  const questions = PERSONA_QUESTIONS[platform];
  const platformName = PLATFORM_NAMES[platform];

  const [step, setStep] = useState(0); // 0, 1, 2 = questions; 3 = generating; 4 = preview
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [generatedPersona, setGeneratedPersona] = useState<PlatformPersona | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editablePersona, setEditablePersona] = useState<PlatformPersona | null>(null);

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[step] = value;
    setAnswers(newAnswers);
  };

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      // Generate persona
      setStep(3);
      setIsGenerating(true);
      try {
        const response = await fetch('/api/generate-persona', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, answers }),
        });
        const data = await response.json();
        setGeneratedPersona(data);
        setEditablePersona(data);
        setStep(4);
      } catch (error) {
        console.error('Generate persona failed:', error);
        // Fallback
        const fallback: PlatformPersona = {
          platformBio: `${platformName} 内容创作者`,
          tone: '真诚、专业',
          styleNotes: '保持自然表达',
          isCustom: true,
        };
        setGeneratedPersona(fallback);
        setEditablePersona(fallback);
        setStep(4);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 0 && step < 4) {
      setStep(step - 1);
    } else if (step === 4) {
      setStep(2); // Go back to last question
    }
  };

  const handleSave = () => {
    if (editablePersona) {
      onSave(editablePersona);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">
            设置 {platformName} 人设
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Progress indicator */}
        {step < 3 && (
          <div className="flex gap-2 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${
                  i <= step ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        {/* Question steps */}
        {step < 3 && (
          <div className="space-y-4">
            <p className="text-gray-700 font-medium">{questions[step]}</p>
            <Textarea
              value={answers[step]}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="输入你的回答..."
              className="min-h-[100px]"
              autoFocus
            />
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 0}
              >
                上一步
              </Button>
              <Button onClick={handleNext} disabled={!answers[step].trim()}>
                {step === 2 ? '生成人设' : '下一步'}
              </Button>
            </div>
          </div>
        )}

        {/* Generating state */}
        {step === 3 && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">正在生成人设...</p>
          </div>
        )}

        {/* Preview and edit */}
        {step === 4 && editablePersona && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">人设定位</label>
              <Textarea
                value={editablePersona.platformBio}
                onChange={(e) =>
                  setEditablePersona({ ...editablePersona, platformBio: e.target.value })
                }
                className="min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">语气关键词</label>
              <Textarea
                value={editablePersona.tone}
                onChange={(e) =>
                  setEditablePersona({ ...editablePersona, tone: e.target.value })
                }
                className="min-h-[40px]"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">风格建议</label>
              <Textarea
                value={editablePersona.styleNotes}
                onChange={(e) =>
                  setEditablePersona({ ...editablePersona, styleNotes: e.target.value })
                }
                className="min-h-[60px]"
              />
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                重新回答
              </Button>
              <Button onClick={handleSave}>保存人设</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
