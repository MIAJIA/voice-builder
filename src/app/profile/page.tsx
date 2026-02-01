'use client';

import Link from 'next/link';
import { ProfileForm } from '@/components/ProfileForm';

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
      </main>
    </div>
  );
}
