'use client';

import { Card } from '@/components/ui/card';

const reminders = [
  '我是在分享"过程"还是在假装"权威"？',
  '如果有人比我懂，那又怎样？',
  '这篇的目标受众不是专家，是半年前的我',
];

export function VoiceReminder() {
  return (
    <Card className="bg-amber-50 border-amber-200 p-4">
      <h3 className="text-sm font-medium text-amber-800 mb-2">
        学习者视角提醒
      </h3>
      <ul className="space-y-1.5">
        {reminders.map((reminder, index) => (
          <li
            key={index}
            className="text-sm text-amber-700 flex items-start gap-2"
          >
            <span className="text-amber-400 mt-0.5">□</span>
            <span>{reminder}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
