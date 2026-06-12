'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAccessToken } from '@privy-io/react-auth';

interface FileDisputeProps {
  orderId: string;
  orderType: 'onramp' | 'offramp';
  onDisputeFiled: () => void;
}

const DISPUTE_REASONS = [
  { value: 'payment_not_received', label: 'Payment not received', description: 'I paid via UPI but merchant claims otherwise' },
  { value: 'usdc_not_received', label: 'USDC not received', description: 'Merchant did not send USDC after I paid' },
  { value: 'wrong_amount', label: 'Wrong amount', description: 'Wrong fiat or USDC amount was sent/received' },
  { value: 'fraud', label: 'Suspected fraud', description: 'Suspicious or fraudulent activity detected' },
  { value: 'technical_issue', label: 'Technical issue', description: 'Platform bug caused a problem' },
  { value: 'other', label: 'Other', description: 'Other reason not listed above' },
] as const;

export function FileDispute({ orderId, orderType, onDisputeFiled }: FileDisputeProps) {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please select a reason for the dispute');
      return;
    }
    if (description.length < 10) {
      setError('Please provide more details (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const authToken = await getAccessToken();
      const response = await fetch(`/api/orders/${orderId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify({
          reason,
          description,
          evidence: evidence.length > 0 ? evidence : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to file dispute');
      }

      setSuccess(true);
      onDisputeFiled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to file dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEvidence = () => {
    // In production, this would upload to a file storage service
    // For now, we'll use a prompt for the URL
    const url = prompt('Enter evidence URL (screenshot of payment, etc.):');
    if (url && url.startsWith('http')) {
      setEvidence([...evidence, url].slice(0, 5));
    }
  };

  const removeEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  if (success) {
    return (
      <Card className="border-yellow-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-500">
            <AlertCircle className="w-5 h-5" />
            Dispute Filed Successfully
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your dispute has been submitted. An admin will review your case within 24 hours.
            You will be notified via email when there's an update.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          File a Dispute
        </CardTitle>
        <CardDescription>
          Only file a dispute if you have a genuine issue with this transaction.
          Misuse of the dispute system may result in account suspension.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Reason for Dispute</Label>
          <div className="grid gap-2">
            {DISPUTE_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`text-left p-3 rounded-lg border transition ${
                  reason === r.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Detailed Description</Label>
          <Textarea
            id="description"
            placeholder="Describe what happened in detail. Include transaction IDs, timestamps, and any relevant information."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Minimum 10 characters required
          </p>
        </div>

        <div className="space-y-2">
          <Label>Evidence (Optional, max 5)</Label>
          <p className="text-xs text-muted-foreground">
            Upload screenshots of payment confirmations, chat logs, etc.
          </p>
          <div className="flex flex-wrap gap-2">
            {evidence.map((url, index) => (
              <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                <span>Evidence {index + 1}</span>
                <button
                  onClick={() => removeEvidence(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
            {evidence.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEvidence}
              >
                <Upload className="w-4 h-4 mr-1" />
                Add Evidence
              </Button>
            )}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !reason || description.length < 10}
          className="w-full bg-red-500 hover:bg-red-600"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Filing Dispute...
            </>
          ) : (
            'File Dispute'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
