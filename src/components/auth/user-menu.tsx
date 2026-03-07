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

  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://aiden.services';

  function handleLogout() {
    window.location.href = `${gatewayUrl}/auth/logout`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-8 w-8 items-center justify-center border border-[#2a2a38] bg-[#111118] text-xs font-bold font-mono text-[#888899] transition-colors hover:border-[#FF0000] hover:text-[#FF0000]">
          {initials}
          {admin && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-[#FF4400] border border-[#0a0a0f]" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-[#2a2a38] bg-[#111118]">
        <DropdownMenuItem disabled className="text-xs text-[#888899]">
          <User className="mr-2 h-3 w-3" />
          {email}
          {admin && (
            <span className="ml-2 border border-[#FF4400]/50 bg-[#FF4400]/10 px-1 py-0 text-[10px] text-[#FF4400]">
              Admin
            </span>
          )}
        </DropdownMenuItem>
        {admin && (
          <>
            <DropdownMenuSeparator className="bg-[#2a2a38]" />
            <DropdownMenuItem asChild className="text-xs uppercase tracking-wider">
              <Link href="/admin">
                <Shield className="mr-2 h-3.5 w-3.5" />
                Admin Dashboard
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="bg-[#2a2a38]" />
        <DropdownMenuItem onClick={handleLogout} className="text-xs uppercase tracking-wider text-[#FF0000]">
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
