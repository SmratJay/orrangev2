'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePrivy, getAccessToken } from '@privy-io/react-auth';
import {
  X, User, Wallet, Bell, Link2, Shield, Download,
  Pencil, Check, Loader2, Copy, ExternalLink, ChevronRight,
  Mail, Globe, Smartphone, LogOut, AlertTriangle,
} from 'lucide-react';

interface ProfileData {
  full_name: string | null;
  email: string | null;
  user_type: string;
  embedded_wallet_address: string | null;
  default_upi_id: string | null;
  notify_order_updates: boolean;
  notify_disputes: boolean;
  created_at: string;
}

interface Props {
  onClose: () => void;
  onNameChange?: (name: string) => void;
}

type Tab = 'profile' | 'linked' | 'sessions' | 'notifications' | 'preferences';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="w-3.5 h-3.5" /> },
  { id: 'linked', label: 'Linked Accounts', icon: <Link2 className="w-3.5 h-3.5" /> },
  { id: 'sessions', label: 'Sessions', icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
  { id: 'preferences', label: 'Preferences', icon: <Globe className="w-3.5 h-3.5" /> },
];

export function ProfileSettings({ onClose, onNameChange }: Props) {
  const { user, logout } = usePrivy();
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Editable fields
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [editUpi, setEditUpi] = useState(false);
  const [upiVal, setUpiVal] = useState('');
  const [walletCopied, setWalletCopied] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // CSV export
  const [exporting, setExporting] = useState(false);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const h: Record<string, string> = {};
    const token = await getAccessToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  // Load profile
  useEffect(() => {
    const load = async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch('/api/users/profile', { headers });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.user);
          setNameVal(data.user.full_name || '');
          setUpiVal(data.user.default_upi_id || '');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load sessions when tab selected
  useEffect(() => {
    if (tab !== 'sessions' || sessions.length > 0) return;
    const load = async () => {
      setSessionsLoading(true);
      try {
        const headers = await authHeaders();
        const res = await fetch('/api/users/sessions', { headers });
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSessionsLoading(false);
      }
    };
    load();
  }, [tab]);

  const save = async (updates: Partial<ProfileData>) => {
    setSaving(true);
    setSaveMsg('');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      setProfile(prev => prev ? { ...prev, ...updates } : prev);
      if (updates.full_name && onNameChange) onNameChange(updates.full_name);
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const downloadCSV = async () => {
    setExporting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/orders/export', { headers });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orrange-orders-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed, please try again');
    } finally {
      setExporting(false);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm('This will sign you out of all devices. Continue?')) return;
    setRevokeLoading(true);
    try {
      const headers = await authHeaders();
      await fetch('/api/users/sessions', { method: 'DELETE', headers });
      logout();
    } catch {
      alert('Failed to revoke sessions');
    } finally {
      setRevokeLoading(false);
    }
  };

  const roleBadge = {
    admin: { label: 'Admin', color: '#FF7A1A', bg: 'rgba(255,122,26,0.12)', border: 'rgba(255,122,26,0.25)' },
    merchant: { label: 'Merchant', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
    user: { label: 'User', color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' },
  }[profile?.user_type || 'user'] || { label: 'User', color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' };

  const displayName = profile?.full_name || user?.email?.address?.split('@')[0] || 'User';

  if (typeof document === 'undefined') return null;

  return createPortal((
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'rgba(13,14,16,0.99)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          maxHeight: '90vh',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-black" style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)' }}>
              {displayName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{displayName}</p>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: roleBadge.bg, border: `1px solid ${roleBadge.border}`, color: roleBadge.color }}>
                {roleBadge.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/8 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar tabs */}
          <div className="w-44 border-r border-white/5 py-3 px-2 shrink-0 flex flex-col gap-0.5">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all w-full"
                style={{
                  background: tab === t.id ? 'rgba(255,122,26,0.12)' : 'transparent',
                  color: tab === t.id ? '#FF7A1A' : 'rgba(255,255,255,0.5)',
                  border: tab === t.id ? '1px solid rgba(255,122,26,0.2)' : '1px solid transparent',
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* ─── PROFILE TAB ─── */}
                {tab === 'profile' && (
                  <div className="space-y-5">
                    <h3 className="text-white font-semibold">Profile Information</h3>

                    {/* Name */}
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">Display Name</label>
                      {editName ? (
                        <div className="space-y-2">
                          <input
                            autoFocus
                            value={nameVal}
                            onChange={e => setNameVal(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { save({ full_name: nameVal.trim() }); setEditName(false); }
                              if (e.key === 'Escape') setEditName(false);
                            }}
                            className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,122,26,0.4)' }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { save({ full_name: nameVal.trim() }); setEditName(false); }}
                              disabled={saving}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-black"
                              style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)' }}
                            >
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Save
                            </button>
                            <button onClick={() => setEditName(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span className="text-sm text-white">{profile?.full_name || <span className="text-muted-foreground/50 italic">Not set</span>}</span>
                          <button onClick={() => setEditName(true)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-primary/10">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">Email</label>
                      <div className="flex items-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Mail className="w-4 h-4 text-muted-foreground mr-2" />
                        <span className="text-sm text-muted-foreground flex-1">{profile?.email || user?.email?.address || '—'}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>Verified</span>
                      </div>
                    </div>

                    {/* Wallet */}
                    {profile?.embedded_wallet_address && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">Embedded Wallet</label>
                        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
                          <code className="flex-1 text-xs font-mono text-muted-foreground truncate">{profile.embedded_wallet_address}</code>
                          <button onClick={() => { navigator.clipboard.writeText(profile.embedded_wallet_address!); setWalletCopied(true); setTimeout(() => setWalletCopied(false), 1500); }} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition">
                            {walletCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => window.open(`https://sepolia.etherscan.io/address/${profile.embedded_wallet_address}`, '_blank')} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Default UPI */}
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1">Default UPI ID</label>
                      <p className="text-xs text-muted-foreground/60 mb-2">Pre-filled in Off-Ramp orders. You can override per order.</p>
                      {editUpi ? (
                        <div className="space-y-2">
                          <input
                            autoFocus
                            value={upiVal}
                            onChange={e => setUpiVal(e.target.value)}
                            placeholder="yourname@upi"
                            onKeyDown={e => {
                              if (e.key === 'Enter') { save({ default_upi_id: upiVal.trim() }); setEditUpi(false); }
                              if (e.key === 'Escape') setEditUpi(false);
                            }}
                            className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,122,26,0.4)' }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { save({ default_upi_id: upiVal.trim() }); setEditUpi(false); }}
                              disabled={saving}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-black"
                              style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)' }}
                            >
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Save
                            </button>
                            <button onClick={() => setEditUpi(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-white">{profile?.default_upi_id || <span className="text-muted-foreground/50 italic">Not set</span>}</span>
                          </div>
                          <button onClick={() => setEditUpi(true)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-primary/10">
                            <Pencil className="w-3 h-3" /> {profile?.default_upi_id ? 'Edit' : 'Add'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Member since */}
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-xs text-muted-foreground">Member since</span>
                      <span className="text-xs text-white">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                    </div>

                    {/* Network */}
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-xs text-muted-foreground">Network</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        <span className="text-xs text-yellow-400 font-medium">Ethereum Sepolia</span>
                      </div>
                    </div>

                    {saveMsg && <p className={`text-xs ${saveMsg === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{saveMsg}</p>}
                  </div>
                )}

                {/* ─── LINKED ACCOUNTS TAB ─── */}
                {tab === 'linked' && (
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Linked Accounts</h3>
                    <p className="text-xs text-muted-foreground">All authentication methods connected to your ORRANGE account.</p>
                    <div className="space-y-2">
                      {(user?.linkedAccounts || []).map((account: any, i: number) => {
                        const isEmail = account.type === 'email';
                        const isGoogle = account.type === 'google_oauth';
                        const isWallet = account.type === 'wallet';
                        const icon = isEmail ? <Mail className="w-4 h-4" /> : isGoogle ? <Globe className="w-4 h-4" /> : <Wallet className="w-4 h-4" />;
                        const label = isEmail ? account.address : isGoogle ? account.email || account.subject : isWallet ? `${account.address?.slice(0, 8)}…${account.address?.slice(-6)}` : account.type;
                        const typeLabel = isEmail ? 'Email' : isGoogle ? 'Google' : isWallet ? `Wallet (${account.walletClientType || 'external'})` : account.type;
                        const color = isEmail ? '#60a5fa' : isGoogle ? '#34d399' : '#FF7A1A';
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15`, color }}>
                              {icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white font-medium truncate">{label}</p>
                              <p className="text-xs text-muted-foreground">{typeLabel}</p>
                            </div>
                            <div className="shrink-0 px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                              Connected
                            </div>
                          </div>
                        );
                      })}
                      {(!user?.linkedAccounts || user.linkedAccounts.length === 0) && (
                        <p className="text-muted-foreground text-sm text-center py-6">No linked accounts found</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── SESSIONS TAB ─── */}
                {tab === 'sessions' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">Active Sessions</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">These are the authentication methods associated with your account.</p>

                    {sessionsLoading ? (
                      <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                    ) : (
                      <div className="space-y-2">
                        {sessions.map((s, i) => {
                          const isEmail = s.type === 'email';
                          const isGoogle = s.type === 'google_oauth';
                          const isWallet = s.type === 'wallet';
                          const icon = isEmail ? <Mail className="w-4 h-4" /> : isGoogle ? <Globe className="w-4 h-4" /> : <Wallet className="w-4 h-4" />;
                          const color = isEmail ? '#60a5fa' : isGoogle ? '#34d399' : '#FF7A1A';
                          const label = s.address || s.client_type || s.type;
                          const verified = s.latest_verified_at ? new Date(s.latest_verified_at).toLocaleDateString('en-IN') : '—';
                          return (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15`, color }}>
                                {icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-mono truncate">{label}</p>
                                <p className="text-xs text-muted-foreground">Last verified: {verified}</p>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                <span className="text-xs text-green-400">Active</span>
                              </div>
                            </div>
                          );
                        })}
                        {sessions.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No session data available</p>}
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/5">
                      <button
                        onClick={revokeAllSessions}
                        disabled={revokeLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                        style={{ border: '1px solid rgba(248,113,113,0.2)' }}
                      >
                        {revokeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                        Sign out of all devices
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── NOTIFICATIONS TAB ─── */}
                {tab === 'notifications' && (
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Notification Preferences</h3>
                    <p className="text-xs text-muted-foreground">Control which in-app notifications you receive.</p>

                    {[
                      { key: 'notify_order_updates' as const, label: 'Order Updates', desc: 'Created, accepted, completed, cancelled' },
                      { key: 'notify_disputes' as const, label: 'Dispute Alerts', desc: 'Filed, resolved, status changes' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <p className="text-sm text-white font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => {
                            const newVal = !profile![item.key];
                            save({ [item.key]: newVal });
                          }}
                          className="relative w-10 h-5.5 rounded-full transition-all shrink-0"
                          style={{
                            background: profile?.[item.key] ? '#FF7A1A' : 'rgba(255,255,255,0.1)',
                            minWidth: '40px',
                            height: '22px',
                          }}
                        >
                          <span
                            className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all"
                            style={{
                              width: '18px',
                              height: '18px',
                              left: profile?.[item.key] ? '18px' : '2px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }}
                          />
                        </button>
                      </div>
                    ))}

                    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,122,26,0.06)', border: '1px solid rgba(255,122,26,0.15)' }}>
                      <p className="text-xs text-orange-300/80">Browser push notifications are also enabled when you grant permission. Check your browser settings if you don't see them.</p>
                    </div>
                  </div>
                )}

                {/* ─── PREFERENCES TAB ─── */}
                {tab === 'preferences' && (
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Preferences</h3>

                    {/* Default Currency */}
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <p className="text-sm text-white font-medium">Default Currency</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Fiat currency for transactions</p>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <span className="text-sm font-semibold text-white">🇮🇳 INR</span>
                      </div>
                    </div>

                    {/* Coming soon items */}
                    {[
                      { label: 'Default View', desc: 'On-Ramp or Off-Ramp as default' },
                      { label: 'Language', desc: 'Interface language' },
                      { label: 'Price Alerts', desc: 'Notify on rate changes' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-4 rounded-xl opacity-50" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <p className="text-sm text-white font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full text-muted-foreground" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          Coming soon
                        </span>
                      </div>
                    ))}

                    {/* Export CSV */}
                    <div className="border-t border-white/5 pt-4">
                      <h4 className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Data Export</h4>
                      <button
                        onClick={downloadCSV}
                        disabled={exporting}
                        className="w-full flex items-center justify-between p-4 rounded-xl transition hover:bg-white/5"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                            <Download className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm text-white font-medium">Download Transaction History</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Full CSV with all order details (IST timezone)</p>
                          </div>
                        </div>
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>

                    {/* KYC Coming Soon */}
                    <div className="flex items-center gap-3 p-4 rounded-xl opacity-60" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">KYC Verification</p>
                        <p className="text-xs text-muted-foreground">Identity verification for higher limits — Coming soon</p>
                      </div>
                      <span className="ml-auto text-xs px-2 py-1 rounded-full text-muted-foreground shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>Soon</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}
