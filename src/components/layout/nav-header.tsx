'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

export function NavHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Search className="h-5 w-5" />
          <span>Research Agent</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
