'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

interface CreditData {
  creditBalance: {
    used: number;
    total: number;
    remaining: number;
    percentUsed: number;
  };
}

export function ApifyCreditBadge() {
  const [data, setData] = useState<CreditData | null>(null);

  useEffect(() => {
    fetch('/api/apify/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => null);
  }, []);

  if (!data) return null;

  const { remaining, total, percentUsed } = data.creditBalance;
  const isLow = percentUsed > 80;
  const isCritical = percentUsed > 95;

  return (
    <div
      className={`flex items-center gap-1.5 border px-2 py-1 text-[10px] font-mono uppercase ${
        isCritical
          ? 'border-[#FF0000] text-[#FF0000] bg-[#FF0000]/10'
          : isLow
            ? 'border-amber-500 text-amber-400 bg-amber-500/10'
            : 'border-[#2a2a38] text-[#888899]'
      }`}
      title={`Apify credits: $${remaining.toFixed(2)} of $${total.toFixed(2)} remaining`}
    >
      <Zap className="h-2.5 w-2.5" />
      <span>${remaining.toFixed(2)}</span>
      <div className="h-1 w-8 bg-[#2a2a38]">
        <div
          className={`h-1 transition-all ${
            isCritical ? 'bg-[#FF0000]' : isLow ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
    </div>
  );
}
