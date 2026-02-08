'use client';

/**
 * Referral Widget
 *
 * Displays user's referral code, progress toward rewards,
 * and easy sharing options.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  generateReferralCode,
  getReferralLink,
  calculateReferralProgress,
  REFERRAL_REWARDS,
  SHARE_TEMPLATES,
} from '@/lib/sharing';
import { analytics } from '@/lib/posthog';
import { useStore } from '@/lib/store';

interface ReferralWidgetProps {
  /** Number of successful referrals */
  referralCount?: number;
}

export function ReferralWidget({ referralCount = 0 }: ReferralWidgetProps) {
  const { profile } = useStore();
  const [referralCode, setReferralCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Generate a unique code based on user profile or random ID
    const userId = profile?.bio || `user-${Date.now()}`;
    setReferralCode(generateReferralCode(userId));
  }, [profile]);

  const referralLink = getReferralLink(referralCode);
  const progress = calculateReferralProgress(referralCount);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    analytics.trackShareButtonClicked('twitter'); // Track as share action
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTwitter = () => {
    const text = SHARE_TEMPLATES.inviteFriend.zh.replace('{url}', referralLink);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    analytics.trackShareButtonClicked('twitter');
  };

  return (
    <Card className="p-4 bg-[#fffef9] border-2 border-[#d4cfc4]">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3
            className="text-sm font-bold text-[#2a2a2a]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            邀请好友
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDetails ? '收起' : '查看奖励'}
          </button>
        </div>

        {/* Referral Code */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 px-3 py-2 bg-[#f4f1ea] border border-[#d4cfc4] text-sm font-mono"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {referralLink}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="border-[#d4cfc4] shrink-0"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {copied ? '已复制!' : '复制'}
          </Button>
        </div>

        {/* Share buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareTwitter}
            className="flex-1 border-[#d4cfc4]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            🐦 分享到 Twitter
          </Button>
        </div>

        {/* Progress bar */}
        {progress.nextTier && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>已邀请 {referralCount} 人</span>
              <span>还需 {progress.remainingForNext} 人解锁下一奖励</span>
            </div>
            <div className="h-2 bg-[#f4f1ea] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2a2a2a] transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Rewards details */}
        {showDetails && (
          <div className="space-y-3 pt-2 border-t border-[#d4cfc4]">
            <p className="text-xs text-gray-500" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              邀请奖励:
            </p>
            {(Object.entries(REFERRAL_REWARDS) as [string, typeof REFERRAL_REWARDS[3]][]).map(
              ([count, reward]) => {
                const threshold = parseInt(count);
                const isUnlocked = referralCount >= threshold;
                return (
                  <div
                    key={count}
                    className={`flex items-start gap-3 p-2 rounded ${
                      isUnlocked ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div
                      className={`text-lg ${isUnlocked ? '' : 'opacity-50'}`}
                    >
                      {isUnlocked ? '✅' : threshold <= 3 ? '🌱' : threshold <= 10 ? '🌟' : '🏆'}
                    </div>
                    <div className="flex-1">
                      <div
                        className="text-sm font-medium"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {reward.name}
                        <span className="text-gray-400 ml-2">({count} 人)</span>
                      </div>
                      <div className="text-xs text-gray-500">{reward.description}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {reward.features.join(' • ')}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* Current tier badge */}
        {progress.currentTier && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600">✓</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              你是 {REFERRAL_REWARDS[progress.currentTier].name}!
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
