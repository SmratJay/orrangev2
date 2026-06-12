'use client';

import { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { LogOut, User, Shield, Copy, ExternalLink, Menu } from 'lucide-react';
import { ProfileSettings } from '@/components/profile-settings';

interface ProfileMenuProps {
  fullName?: string | null;
  walletAddress?: string | null;
  userType?: 'user' | 'merchant' | 'admin';
  onNameChange?: (name: string) => void;
}

export function ProfileMenu({ fullName: initialName, walletAddress, userType = 'user', onNameChange }: ProfileMenuProps) {
  const { user, logout } = usePrivy();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [displayName, setDisplayName] = useState(initialName || '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setDisplayName(initialName || ''); }, [initialName]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const name = displayName || user?.email?.address?.split('@')[0] || 'User';
  const email = user?.email?.address;
  const short = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : null;

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const roleBadge = {
    admin: { label: 'Admin', color: 'text-orange-400', bg: 'rgba(255,122,26,0.12)', border: 'rgba(255,122,26,0.25)' },
    merchant: { label: 'Merchant', color: 'text-blue-400', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
    user: { label: 'User', color: 'text-green-400', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' },
  }[userType];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-black" style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)' }}>
          {name[0]?.toUpperCase()}
        </div>
        <span className="hidden sm:block text-sm text-white font-medium max-w-[100px] truncate">{name}</span>
        <Menu className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl z-50 overflow-hidden"
          style={{
            background: 'rgba(15,16,18,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Profile header */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-black shrink-0" style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)' }}>
                {name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm truncate">{name}</p>
                {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
              </div>
              <div className="ml-auto shrink-0 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: roleBadge.bg, border: `1px solid ${roleBadge.border}` }}>
                <span className={roleBadge.color}>{roleBadge.label}</span>
              </div>
            </div>
          </div>

          {/* Wallet address */}
          {walletAddress && (
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Wallet</p>
              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <code className="flex-1 text-xs font-mono text-muted-foreground truncate">{short}</code>
                <button onClick={copyAddress} className="text-xs px-2 py-0.5 rounded text-muted-foreground hover:text-white transition" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {copied ? '✓' : <Copy className="w-3 h-3" />}
                </button>
                <button onClick={() => window.open(`https://sepolia.etherscan.io/address/${walletAddress}`, '_blank')} className="text-muted-foreground hover:text-white transition">
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Menu items */}
          <div className="p-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition text-left"
              onClick={() => { setOpen(false); setShowSettings(true); }}
            >
              <User className="w-4 h-4" />
              <span>Profile Settings</span>
            </button>

            {userType === 'admin' && (
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition text-left"
                style={{ color: '#FF7A1A' }}
                onClick={() => { setOpen(false); }}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Panel</span>
              </button>
            )}

            <div className="my-1 border-t border-white/5" />

            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/8 transition text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <ProfileSettings
          onClose={() => setShowSettings(false)}
          onNameChange={(n) => { setDisplayName(n); onNameChange?.(n); }}
        />
      )}
    </div>
  );
}
