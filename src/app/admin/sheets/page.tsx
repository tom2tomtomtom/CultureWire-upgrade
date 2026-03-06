'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, RefreshCw, Table } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AdminSheetsPage() {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/sheets', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Synced ${data.count || 0} influencers to Google Sheets`);
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSyncing(false);
    }
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
          <Table className="h-6 w-6" />
          Google Sheets Sync
        </h1>
        <p className="mt-1 text-muted-foreground">
          Sync curated influencers to Google Sheets for sharing with the team.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sync Influencers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Push all curated influencers from the database to the configured Google Sheet.
          </p>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing...</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" />Sync to Sheets</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
