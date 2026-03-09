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
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-lg border border-[#2a2a38] bg-[#111118] p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FF4400]">
            Paid Subscription Required
          </p>
          <h1 className="mt-3 text-3xl font-bold uppercase tracking-tight text-white">
            AIDEN.Listen
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#888899]">
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
              <span className="mt-0.5 text-[#FF4400]">+</span>
              <span className="text-xs text-[#888899]">{feature}</span>
            </div>
          ))}
        </div>

        <div className="mb-8 border border-[#2a2a38] bg-[#0a0a0f] p-4 text-center">
          <p className="text-2xl font-bold font-mono text-white">$999<span className="text-sm font-normal text-[#888899]">/mo</span></p>
          <p className="mt-1 text-xs text-[#888899]">Unlimited searches. Unlimited users per org.</p>
        </div>

        {/* Form or Success */}
        {submitted ? (
          <div className="border border-[#FF4400]/30 bg-[#FF4400]/5 p-6 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-[#FF4400]">
              Application Received
            </p>
            <p className="mt-2 text-sm text-[#888899]">
              We&apos;ll review your application and get back to you within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#888899] mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full border border-[#2a2a38] bg-[#0a0a0f] px-3 py-2 text-sm text-white placeholder:text-[#555566] focus:border-[#FF4400] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#888899] mb-1.5">
                Company / Agency
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company name"
                className="w-full border border-[#2a2a38] bg-[#0a0a0f] px-3 py-2 text-sm text-white placeholder:text-[#555566] focus:border-[#FF4400] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full border-2 border-[#FF4400] bg-[#FF4400]/10 px-4 py-3 text-sm font-bold uppercase tracking-widest text-[#FF4400] transition-colors hover:bg-[#FF4400]/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Apply for Access'}
            </button>
          </form>
        )}

        {/* Back link */}
        <div className="mt-6 text-center">
          <a
            href="https://www.aiden.services"
            className="text-xs text-[#555566] hover:text-[#888899] transition-colors"
          >
            Back to AIDEN Hub
          </a>
        </div>
      </div>
    </div>
  );
}
