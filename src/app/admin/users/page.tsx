'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import type { SignupRequest } from '@/lib/types';

export default function AdminUsersPage() {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/requests')
      .then((r) => r.json())
      .then((data) => setRequests(data.requests || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-1 h-3 w-3" />
            Admin
          </Button>
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" />
          User Management
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Signup Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-muted-foreground">No signup requests yet.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{req.full_name || req.email}</p>
                    <p className="text-xs text-muted-foreground">{req.email}</p>
                    {req.company && <p className="text-xs text-muted-foreground">{req.company}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                    <Badge
                      variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}
                    >
                      {req.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
