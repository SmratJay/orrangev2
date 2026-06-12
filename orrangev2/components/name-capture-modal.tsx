'use client';

import { useState } from 'react';
import { getAccessToken } from '@privy-io/react-auth';

interface Props {
  onComplete: (name: string) => void;
}

export function NameCaptureModal({ onComplete }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError('Please enter at least 2 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      await fetch('/api/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ full_name: trimmed }),
      });
      onComplete(trimmed);
    } catch {
      setError('Something went wrong, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ background: 'rgba(11,12,14,0.9)', backdropFilter: 'blur(16px)' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))',
          border: '1px solid rgba(255,122,26,0.2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,122,26,0.08)',
        }}
      >
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-black"
            style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)', boxShadow: '0 0 32px rgba(255,122,26,0.35)' }}>
            O
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-1">Welcome to ORRANGE</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">What should we call you?</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder:text-muted-foreground/50 outline-none transition"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(255,122,26,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-black text-sm transition btn-orange disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)' }}
          >
            {loading ? 'Saving…' : "Let's go →"}
          </button>
        </form>
      </div>
    </div>
  );
}
