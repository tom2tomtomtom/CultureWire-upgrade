'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/10 relative">
          <span className="text-xs font-medium">{initials}</span>
          {admin && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-yellow-500 border-2 border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          <User className="mr-2 h-3 w-3" />
          {email}
          {admin && <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">Admin</Badge>}
        </DropdownMenuItem>
        {admin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
