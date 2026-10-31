import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, Monitor, X, AlertTriangle, Terminal } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { api } from '../lib/api';

interface VncViewerModalProps {
  open: boolean;
  onClose: () => void;
  vncUrl: string;
}

export function VncViewerModal({ open, onClose, vncUrl }: VncViewerModalProps) {
  const [key, setKey] = useState(0);
  const [active, setActive] = useState<boolean | null>(null);
  const [forceIframe, setForceIframe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.getVncInfo()
        .then(res => {
          setActive(res.active ?? null);
        })
        .catch(() => setActive(false))
        .finally(() => setLoading(false));
    }
  }, [open, key]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-6xl h-[85vh] rounded-xl border border-border bg-card flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Live Browser VNC Session</h3>
                {active === true && (
                  <Badge variant="success" className="text-[10px] py-0 px-1.5">Online</Badge>
                )}
                {active === false && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Port 8080 Offline</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Connected to Xvfb :99 remote display</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setKey(k => k + 1)}
              title="Reload Frame"
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Reconnect
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(vncUrl, '_blank')}
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> New Tab
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-black relative flex flex-col items-center justify-center">
          {active === false && !forceIframe ? (
            <div className="max-w-lg mx-4 p-6 rounded-xl border border-amber-500/30 bg-card text-center space-y-4 shadow-xl">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">noVNC Port 8080 Tidak Terdeteksi</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Aplikasi sedang berjalan di Windows host (<code className="text-primary">npm run dev</code>).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border text-left text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  <span>Informasi Tampilan Browser:</span>
                </div>
                <p className="text-muted-foreground leading-normal">
                  Karena Anda menjalankan via <code className="text-sky-400 font-mono">npm run dev</code> di Windows, browser Chrome dengan opsi <code className="text-primary font-mono">headless: false</code> akan otomatis muncul langsung sebagai jendela desktop di layar Anda (bukan via VNC).
                </p>
                <p className="text-muted-foreground leading-normal">
                  Gunakan <code className="text-emerald-400 font-mono">docker compose up</code> jika ingin memonitor via noVNC remote.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Cek Lagi
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setForceIframe(true)} className="text-xs text-muted-foreground">
                  Buka Iframe Saja
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              key={key}
              src={vncUrl}
              className="w-full h-full border-0"
              title="Live Browser VNC"
              allow="fullscreen; clipboard-read; clipboard-write"
            />
          )}
        </div>
      </div>
    </div>
  );
}
