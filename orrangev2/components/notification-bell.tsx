'use client';

import { useState, useEffect, useRef } from 'react';
import { getAccessToken } from '@privy-io/react-auth';
import { Bell, X, CheckCheck, ShoppingCart, AlertTriangle, CreditCard, Info } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  order_created: <ShoppingCart className="w-4 h-4" />,
  order_completed: <CheckCheck className="w-4 h-4" />,
  order_cancelled: <X className="w-4 h-4" />,
  order_accepted: <ShoppingCart className="w-4 h-4" />,
  payment_sent: <CreditCard className="w-4 h-4" />,
  payment_received: <CreditCard className="w-4 h-4" />,
  dispute_filed: <AlertTriangle className="w-4 h-4" />,
  dispute_resolved: <CheckCheck className="w-4 h-4" />,
  system: <Info className="w-4 h-4" />,
};

const TYPE_COLOR: Record<string, string> = {
  order_completed: '#4ade80',
  payment_received: '#4ade80',
  dispute_resolved: '#4ade80',
  order_cancelled: '#f87171',
  dispute_filed: '#fb923c',
  order_created: '#FF7A1A',
  order_accepted: '#60a5fa',
  payment_sent: '#60a5fa',
  system: '#94a3b8',
};

interface NotificationBellProps {
  userId?: string; // internal DB user id for realtime subscription
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const h: Record<string, string> = {};
      if (token) h['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/notifications', { headers: h });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('[NotificationBell] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Realtime subscription via Supabase
  useEffect(() => {
    if (!userId) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          // Browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(newNotif.title, { body: newNotif.message, icon: '/icon.svg' });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Request browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAllRead = async () => {
    const token = await getAccessToken();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    await fetch('/api/notifications', { method: 'PATCH', headers: h, body: JSON.stringify({ all: true }) });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const token = await getAccessToken();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    await fetch('/api/notifications', { method: 'PATCH', headers: h, body: JSON.stringify({ ids: [id] }) });
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-xl transition-all"
        style={{
          border: '1px solid rgba(255,255,255,0.08)',
          background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        }}
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-black"
            style={{ background: '#FF7A1A' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-50 overflow-hidden"
          style={{
            background: 'rgba(15,16,18,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unread > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium text-black" style={{ background: '#FF7A1A' }}>
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:text-primary/80 transition">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-white/4 border-b border-white/4 last:border-0"
                  style={{ background: n.read ? 'transparent' : 'rgba(255,122,26,0.04)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${TYPE_COLOR[n.type] || '#94a3b8'}18`, color: TYPE_COLOR[n.type] || '#94a3b8' }}
                  >
                    {TYPE_ICON[n.type] || <Info className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${n.read ? 'text-muted-foreground' : 'text-white'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground/40 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#FF7A1A' }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
