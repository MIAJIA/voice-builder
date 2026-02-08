'use client';

import Link from 'next/link';
import { ProfileForm } from '@/components/ProfileForm';
import { ReferralWidget } from '@/components/ReferralWidget';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            ← Voice Builder
          </Link>
          <Link
            href="/chat"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            开始 Co-think
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Voice Profile</h1>
          <p className="text-gray-600 mt-2">
            设置你的表达风格，帮助 AI 更好地理解和保持你的 voice
          </p>
        </div>

        <ProfileForm />

        {/* Referral section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">邀请好友</h2>
            <p className="text-gray-600 text-sm mt-1">
              邀请朋友使用 Voice Builder，获得奖励
            </p>
          </div>
          <ReferralWidget referralCount={0} />
        </div>
      </main>
    </div>
  );
}
