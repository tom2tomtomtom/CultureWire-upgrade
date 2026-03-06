'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Search, Grid3X3, Users, Shield } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '@/components/auth/user-menu';
import { cn } from '@/lib/utils';

export function NavHeader({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/culture-wire" className="flex items-center gap-2 font-semibold">
            <Zap className="h-5 w-5" />
            <span>CultureWire</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/culture-wire"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === '/culture-wire' || pathname === '/'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </Link>
            <Link
              href="/culture-wire/categories"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                pathname.startsWith('/culture-wire/categories')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Categories
            </Link>
            <Link
              href="/culture-wire/influencers"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                pathname.startsWith('/culture-wire/influencers')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Influencers
            </Link>
            <Link
              href="/"
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                pathname.startsWith('/project') || pathname.startsWith('/research')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Research
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
