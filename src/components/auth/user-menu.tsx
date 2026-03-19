'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Shield } from 'lucide-react';

const ADMIN_DOMAINS = (process.env.NEXT_PUBLIC_ADMIN_DOMAINS || 'altshift.com.au,motherlondon.com,uncommon.london')
  .split(',')
  .map((d) => d.trim().toLowerCase());

function isAdminEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? ADMIN_DOMAINS.includes(domain) : false;
}

export function UserMenu({ email }: { email: string | null }) {
  if (!email) return null;

  const admin = isAdminEmail(email);
  const initials = email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold font-mono text-gray-500 transition-colors hover:border-[#8B3F4F] hover:text-[#8B3F4F]">
          {initials}
          {admin && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#A85566] border border-white" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-gray-200 bg-white">
        <DropdownMenuItem disabled className="text-xs text-gray-500">
          <User className="mr-2 h-3 w-3" />
          {email}
          {admin && (
            <span className="ml-2 rounded border border-[#A85566]/50 bg-[#A85566]/10 px-1 py-0 text-[10px] text-[#A85566]">
              Admin
            </span>
          )}
        </DropdownMenuItem>
        {admin && (
          <>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem asChild className="text-xs">
              <Link href="/admin">
                <Shield className="mr-2 h-3.5 w-3.5" />
                Admin Dashboard
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="bg-gray-200" />
        <DropdownMenuItem onClick={handleLogout} className="text-xs text-[#8B3F4F]">
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
