'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function SubscribePage() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#A85566]">
            Paid Subscription Required
          </p>
          <h1 className="mt-3 text-3xl font-bold uppercase tracking-tight text-gray-900">
            AIDEN.Listen
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Cultural intelligence across 9 platforms. Surface opportunities, tensions
            and trends before they hit the mainstream.
          </p>
        </div>

        {/* Features */}
        <div className="mb-8 grid grid-cols-2 gap-3">
          {[
            'Reddit, TikTok, YouTube, Instagram + 5 more',
            'AI-scored cultural opportunities',
            'Tension & risk detection',
            'Strategic briefs & export',
            'Real-time brand monitoring',
            'Shareable team reports',
          ].map((feature) => (
            <div key={feature} className="flex items-start gap-2">
              <span className="mt-0.5 text-[#A85566]">+</span>
              <span className="text-xs text-gray-500">{feature}</span>
            </div>
          ))}
        </div>

        <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold font-mono text-gray-900">$999<span className="text-sm font-normal text-gray-500">/mo</span></p>
          <p className="mt-1 text-xs text-gray-500">Unlimited searches. Unlimited users per org.</p>
        </div>

        {/* Form or Success */}
        {submitted ? (
          <div className="rounded-xl border border-[#A85566]/30 bg-[#A85566]/5 p-6 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-[#A85566]">
              Application Received
            </p>
            <p className="mt-2 text-sm text-gray-500">
              We&apos;ll review your application and get back to you within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#A85566] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                Company / Agency
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company name"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#A85566] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border-2 border-[#A85566] bg-[#A85566]/10 px-4 py-3 text-sm font-bold uppercase tracking-widest text-[#A85566] transition-colors hover:bg-[#A85566]/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Apply for Access'}
            </button>
          </form>
        )}

        {/* Back link */}
        <div className="mt-6 text-center">
          <a
            href="https://www.aiden.services"
            className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
          >
            Back to AIDEN Hub
          </a>
        </div>
      </div>
    </div>
  );
}
