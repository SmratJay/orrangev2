'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { getAccessToken } from '@privy-io/react-auth';
import { AuthGuard } from '@/components/auth-guard';

interface DisputeDetail {
  id: string;
  status: string;
  reason: string;
  description: string;
  filed_by_type: string;
  filed_at: string;
  evidence_urls: string[];
  resolution_notes?: string;
  resolution_action?: string;
  resolved_at?: string;
  order: {
    id: string;
    type: string;
    fiat_amount: number;
    usdc_amount: number;
    status: string;
  };
  messages: {
    id: string;
    sender_type: string;
    message: string;
    created_at: string;
  }[];
}

const RESOLUTION_OPTIONS = [
  { value: 'resolved_user_favor', label: 'User Favor - Release to User', action: 'release_to_user' },
  { value: 'resolved_merchant_favor', label: 'Merchant Favor - Release to Merchant', action: 'release_to_merchant' },
  { value: 'resolved_split', label: 'Split Decision - 50/50 Split', action: 'split_50_50' },
  { value: 'resolved_no_action', label: 'No Action - No Fault Found', action: 'no_action' },
];

function DisputeDetailContent() {
  const router = useRouter();
  const params = useParams();
  const disputeId = params.id as string;

  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDispute();
  }, [disputeId]);

  const fetchDispute = async () => {
    try {
      const authToken = await getAccessToken();
      const response = await fetch(`/api/admin/disputes/${disputeId}`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dispute');
      }

      const data = await response.json();
      setDispute(data.dispute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolution) {
      setError('Please select a resolution');
      return;
    }
    if (notes.length < 10) {
      setError('Please provide detailed resolution notes (min 10 characters)');
      return;
    }

    setResolving(true);
    setError(null);

    try {
      const selectedOption = RESOLUTION_OPTIONS.find(o => o.value === resolution);
      const authToken = await getAccessToken();

      const response = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify({
          resolution,
          notes,
          action: selectedOption?.action || 'no_action',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to resolve dispute');
      }

      await fetchDispute();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Dispute not found</p>
      </div>
    );
  }

  const isResolved = dispute.status.startsWith('resolved');

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Button variant="ghost" onClick={() => router.push('/admin')} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <h1 className="text-xl font-bold">Dispute Details</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order #{dispute.order.id.slice(0, 8)}</span>
              <Badge variant={dispute.order.type === 'onramp' ? 'default' : 'secondary'}>
                {dispute.order.type}
              </Badge>
            </CardTitle>
            <CardDescription>
              ₹{dispute.order.fiat_amount} → {dispute.order.usdc_amount} USDC
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Dispute Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Dispute Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="font-medium capitalize">{dispute.status.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Filed By</Label>
                <p className="font-medium capitalize">{dispute.filed_by_type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="font-medium">{dispute.reason.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Filed At</Label>
                <p className="font-medium">{new Date(dispute.filed_at).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1 p-3 bg-muted rounded-lg">{dispute.description}</p>
            </div>

            {dispute.evidence_urls.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Evidence</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {dispute.evidence_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Evidence {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolution Section */}
        {!isResolved ? (
          <Card className="mb-6 border-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-yellow-500" />
                Resolve Dispute
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label>Resolution Decision</Label>
                <div className="grid gap-2">
                  {RESOLUTION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setResolution(option.value)}
                      className={`text-left p-3 rounded-lg border transition ${
                        resolution === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium">{option.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Resolution Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Explain your decision in detail. This will be visible to both parties."
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                onClick={handleResolve}
                disabled={resolving || !resolution || notes.length < 10}
                className="w-full"
              >
                {resolving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  'Submit Resolution'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-green-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-5 h-5" />
                Resolved
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Decision</Label>
                <p className="font-medium capitalize">{dispute.status.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Resolution Notes</Label>
                <p className="mt-1 p-3 bg-muted rounded-lg">{dispute.resolution_notes}</p>
              </div>
              {dispute.resolved_at && (
                <div>
                  <Label className="text-muted-foreground">Resolved At</Label>
                  <p className="font-medium">{new Date(dispute.resolved_at).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dispute.messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No messages yet</p>
            ) : (
              <div className="space-y-4">
                {dispute.messages.map((msg) => (
                  <div key={msg.id} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium capitalize">{msg.sender_type}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function DisputeDetailPage() {
  return (
    <AuthGuard>
      <DisputeDetailContent />
    </AuthGuard>
  );
}
