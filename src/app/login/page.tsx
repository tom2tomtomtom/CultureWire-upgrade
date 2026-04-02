'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/culture-wire';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/home_hero_user_hires_v2.png')" }}
    >
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 mx-4">
        <div className="flex justify-center mb-6">
          <Image src="/images/cw-logo-black.svg" alt="Culture Wire" width={180} height={48} priority />
        </div>
        <p className="text-center text-gray-500 text-sm mb-8">Brand Intelligence Platform</p>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-6">
          <p className="text-sm text-gray-600">
            Enter your <strong>@altshift.com.au</strong> email to sign in. External users can{' '}
            <a href="/subscribe" className="text-[#8B3F4F] hover:underline">request access here</a>.
          </p>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">&#9993;</div>
            <h2 className="text-xl font-semibold mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm">
              We&apos;ve sent a magic link to <strong>{email}</strong>. Click the link to sign in.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <span className="text-3xl">&#128274;</span>
            </div>
            <h2 className="text-xl font-bold text-center mb-2">Welcome Back</h2>
            <p className="text-gray-500 text-sm text-center mb-6">
              Already approved? Enter your email to receive a magic link for secure, passwordless login.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-[#8B3F4F] focus:outline-none focus:ring-1 focus:ring-[#8B3F4F]"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-b from-[#8B3F4F] to-[#6B2937] py-3 text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
