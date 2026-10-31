import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ListOrdered,
  Network,
  FolderKanban,
  CalendarClock,
  KeyRound,
  Monitor,
  Settings,
  BookOpen,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  User,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { api } from '../lib/api';
import type { ConfigStatus } from '../types';

interface LayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  onOpenVncModal: () => void;
  currentUser?: { username: string; isDefault?: boolean };
  onLogout?: () => void;
}

export function Layout({
  currentTab,
  onTabChange,
  children,
  onOpenVncModal,
  currentUser,
  onLogout,
}: LayoutProps) {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      api.getConfigStatus().then(setConfigStatus).catch(() => {});
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview & Metrics', icon: LayoutDashboard },
    { id: 'queue', label: 'Queue & History', icon: ListOrdered },
    { id: 'builder', label: 'Workflow Builder', icon: Network, highlight: true },
    { id: 'templates', label: 'Template Library', icon: FolderKanban },
    { id: 'schedules', label: 'Scheduled Runs', icon: CalendarClock },
    { id: 'keys', label: 'API Keys', icon: KeyRound },
    { id: 'vnc', label: 'Live VNC Stream', icon: Monitor },
    { id: 'settings', label: 'Quick Setup & Settings', icon: Settings },
  ];

  const redisConnected = configStatus?.redis?.status === 'connected';

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-card/60 flex flex-col shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight tracking-tight">Playwright API</div>
              <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Automation Engine</div>
            </div>
          </div>
          <span className="live-pulse w-2 h-2 rounded-full bg-emerald-500" title="Engine Active" />
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="px-3 pt-3">
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold font-mono leading-none">{currentUser.username}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Administrator</div>
                </div>
              </div>
              {currentUser.isDefault && (
                <span title="Default password in use. Change in Settings.">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </span>
              )}
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? 'text-primary-foreground' : 'text-primary'}`} />
                  <span>{item.label}</span>
                </div>
                {item.highlight && !active && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono">
                    Visual
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom System Status & Logout */}
        <div className="p-3 border-t border-border bg-card/40 space-y-2 text-xs">
          {/* Redis Status */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/40">
            <span className="text-muted-foreground text-[11px] font-medium">Redis Broker:</span>
            {redisConnected ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-destructive font-medium">
                <AlertCircle className="w-3 h-3" /> Setup Needed
              </span>
            )}
          </div>

          {/* VNC Quick Action */}
          <button
            onClick={onOpenVncModal}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border border-border/70 hover:bg-muted/50 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Monitor className="w-3 h-3 text-sky-400" />
              <span>VNC Server (8080)</span>
            </div>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </button>

          {/* Sign Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-destructive/30 hover:bg-destructive/10 text-destructive text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-card/40 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-sm capitalize">
              {navItems.find(i => i.id === currentTab)?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api-docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>API Documentation</span>
            </a>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-background/50">
          {children}
        </main>
      </div>
    </div>
  );
}
