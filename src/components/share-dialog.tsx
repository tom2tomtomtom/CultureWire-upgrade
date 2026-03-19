'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Copy, Link2, Loader2, MessageSquare, Share2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ShareDialogProps {
  reportType: 'culture_wire' | 'research';
  reportId: string;
  reportTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShareRecord {
  id: string;
  shared_with: string;
  created_at: string;
}

export function ShareDialog({
  reportType,
  reportId,
  reportTitle,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [emailInput, setEmailInput] = useState('');
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [isSendingToChat, setIsSendingToChat] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    setIsLoadingShares(true);
    try {
      const res = await fetch(
        `/api/share?reportType=${reportType}&reportId=${reportId}`
      );
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares || []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoadingShares(false);
    }
  }, [reportType, reportId]);

  useEffect(() => {
    if (open) {
      loadShares();
    }
  }, [open, loadShares]);

  async function handleShare() {
    const emails = emailInput
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      toast.error('Enter at least one email address');
      return;
    }

    setIsSharing(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, reportId, emails }),
      });

      if (res.ok) {
        toast.success(`Shared with ${emails.length} recipient${emails.length > 1 ? 's' : ''}`);
        setEmailInput('');
        loadShares();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to share');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsSharing(false);
    }
  }

  async function handleRemoveShare(email: string) {
    setRemovingEmail(email);
    try {
      const res = await fetch(
        `/api/share?reportType=${reportType}&reportId=${reportId}&email=${encodeURIComponent(email)}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast.success(`Removed ${email}`);
        setShares((prev) => prev.filter((s) => s.shared_with !== email));
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRemovingEmail(null);
    }
  }

  function handleCopyLink() {
    const path =
      reportType === 'culture_wire'
        ? `/culture-wire/${reportId}`
        : `/project/${reportId}`;
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  }

  async function handleSendToChat() {
    setIsSendingToChat(true);
    try {
      const res = await fetch('/api/share/aiden-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, reportId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to generate summary');
        return;
      }

      const { markdown } = await res.json();
      await navigator.clipboard.writeText(markdown);
      toast.success('Report summary copied to clipboard. Paste into AIDEN Chat.');
    } catch {
      toast.error('Network error');
    } finally {
      setIsSendingToChat(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 rounded-xl sm:rounded-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xs font-bold uppercase tracking-widest text-gray-900">
            Share Report
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 truncate">
            {reportTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Share via email
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                placeholder="email@example.com, another@example.com"
                className="flex-1 border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#8B3F4F] focus:outline-none rounded-lg"
              />
              <button
                onClick={handleShare}
                disabled={isSharing || !emailInput.trim()}
                className="flex items-center gap-1.5 border border-[#8B3F4F] bg-[#8B3F4F]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#8B3F4F] transition-colors hover:bg-[#8B3F4F]/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
              >
                {isSharing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Share2 className="h-3 w-3" />
                )}
                Share
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="flex flex-1 items-center justify-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:border-[#8B3F4F] hover:text-[#8B3F4F] rounded-lg"
            >
              <Link2 className="h-3 w-3" />
              Copy Link
            </button>
            <button
              onClick={handleSendToChat}
              disabled={isSendingToChat}
              className="flex flex-1 items-center justify-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:border-[#8B3F4F] hover:text-[#8B3F4F] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
            >
              {isSendingToChat ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <MessageSquare className="h-3 w-3" />
              )}
              AIDEN Chat
            </button>
          </div>

          {/* Current shares */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Shared with
            </label>
            {isLoadingShares ? (
              <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            ) : shares.length === 0 ? (
              <p className="py-2 text-xs text-gray-400">Not shared with anyone yet.</p>
            ) : (
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between border border-gray-200 bg-gray-50 px-3 py-1.5 rounded-lg"
                  >
                    <span className="text-xs text-gray-900 truncate">
                      {share.shared_with}
                    </span>
                    <button
                      onClick={() => handleRemoveShare(share.shared_with)}
                      disabled={removingEmail === share.shared_with}
                      className="ml-2 text-gray-400 transition-colors hover:text-[#8B3F4F] disabled:opacity-40"
                    >
                      {removingEmail === share.shared_with ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
