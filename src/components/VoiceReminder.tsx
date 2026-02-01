'use client';

import { useState, useEffect } from 'react';

// 句库：分享心态
const REMINDERS = [
  // 关于"不完美也可以分享"
  '不完美的想法也值得分享',
  '你是在分享学习过程，不是发表权威结论',
  '半年前的你会觉得这个有价值吗？那就够了',
  '如果有人比你懂，那又怎样？',

  // 关于"受众定位"
  '你的目标受众不是专家，是曾经的自己',
  '总有人正处在你曾经走过的路上',
  '你的经验对某个人来说可能是及时雨',

  // 关于"行动 vs 完美"
  'Done is better than perfect',
  '发出去，才能收到反馈',
  '输出是最好的学习方式',
  '先完成，再完美',

  // 关于"独特价值"
  '你的视角本身就是独特的',
  '没有人能用你的方式讲述你的故事',
  '真实比完美更有共鸣',

  // 关于"降低门槛"
  '一条推文，不是论文',
  '分享一个小发现，而不是大道理',
  '今天学到的，今天就可以分享',

  // 鼓励行动
  '想法只有分享出去才能生长',
  '你的声音值得被听见',
  '世界需要更多真实的声音',
];

export function VoiceReminder() {
  const [reminder, setReminder] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Pick a random reminder on mount
    const randomIndex = Math.floor(Math.random() * REMINDERS.length);
    setReminder(REMINDERS[randomIndex]);
  }, []);

  if (!isVisible || !reminder) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-amber-500 text-lg">💡</span>
        <p className="text-sm text-amber-800 font-medium">{reminder}</p>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-600 text-lg leading-none ml-2"
        title="关闭提醒"
      >
        ×
      </button>
    </div>
  );
}
