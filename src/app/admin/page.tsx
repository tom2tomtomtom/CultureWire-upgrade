'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Users, Clock, Shield } from 'lucide-react';
import type { SignupRequest } from '@/lib/types';

export default function AdminPage() {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const domain = user.email?.split('@')[1]?.toLowerCase();
      const adminDomains = (process.env.NEXT_PUBLIC_ADMIN_DOMAINS || 'altshift.com.au').split(',').map(d => d.trim());
      if (!domain || !adminDomains.includes(domain)) {
        router.push('/');
        return;
      }
      setIsAdmin(true);

      // Fetch signup requests
      const res = await fetch('/api/admin/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleAction(requestId: string, action: 'approve' | 'reject') {
    setActionLoading(requestId);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => r.id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r)
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (!isAdmin || loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const processed = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Manage user access and system settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pending.length}</p>
                <p className="text-sm text-muted-foreground">Pending requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{requests.length}</p>
                <p className="text-sm text-muted-foreground">Total requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Access Requests</CardTitle>
            <CardDescription>Review and approve new user requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{req.full_name || req.email}</p>
                    <p className="text-sm text-muted-foreground">{req.email}</p>
                    {req.company && <p className="text-xs text-muted-foreground">{req.company}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(req.id, 'reject')}
                      disabled={actionLoading === req.id}
                    >
                      {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAction(req.id, 'approve')}
                      disabled={actionLoading === req.id}
                    >
                      {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {processed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processed Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processed.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{req.full_name || req.email}</p>
                    <p className="text-xs text-muted-foreground">{req.email}</p>
                  </div>
                  <Badge variant={req.status === 'approved' ? 'default' : 'destructive'}>
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
