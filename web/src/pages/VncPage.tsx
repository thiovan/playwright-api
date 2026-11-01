import React, { useState, useEffect } from 'react';
import { Monitor, RefreshCw, ExternalLink, AlertTriangle, Terminal, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';

export function VncPage() {
  const [vncUrl, setVncUrl] = useState('');
  const [active, setActive] = useState<boolean | null>(null);
  const [forceIframe, setForceIframe] = useState(false);
  const [key, setKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const checkVnc = () => {
    setLoading(true);
    api.getVncInfo()
      .then(res => {
        const host = window.location.hostname || res.host || 'localhost';
        const port = res.port || 8080;
        setVncUrl(`http://${host}:${port}/vnc.html?autoconnect=true`);
        setActive(res.active ?? null);
      })
      .catch(() => {
        setVncUrl(`http://${window.location.hostname}:8080/vnc.html?autoconnect=true`);
        setActive(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    checkVnc();
  }, [key]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Banner */}
      <div className="px-6 py-3 border-b border-border bg-card/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs leading-none">Live Browser noVNC Stream</h3>
              {active === true && (
                <Badge variant="success" className="text-[10px] py-0 px-1.5">Connected (Port 8080)</Badge>
              )}
              {active === false && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Offline / Local Mode</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Live viewport mirroring Xvfb :99 remote display. Browser windows appear when <code className="text-primary">headless: false</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setKey(k => k + 1)}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Reconnect
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => window.open(vncUrl, '_blank')}
            disabled={!vncUrl}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open in New Tab
          </Button>
        </div>
      </div>

      {/* Standby & Headless Guide Banner */}
      {active === true && (
        <div className="px-6 py-2 bg-muted/40 border-b border-border/80 flex items-center justify-between text-xs text-muted-foreground select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>
              <strong>Stream Aktif:</strong> Layar hitam/blank adalah kondisi normal saat idle (standby). Jendela browser Chromium otomatis tampil di sini saat menjalankan workflow dengan mode <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[11px] text-primary">headless: false</code>.
            </span>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 bg-black relative flex flex-col items-center justify-center">
        {active === false && !forceIframe ? (
          <div className="max-w-xl mx-4 p-6 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-base text-foreground">noVNC Service Not Reachable (Port 8080 Refused)</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Server mendeteksi port 8080 tidak aktif. Hal ini normal saat Anda menjalankan aplikasi langsung di Windows host menggunakan <code className="text-primary font-mono">npm run dev</code>.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-card/80 border border-border text-left text-xs space-y-2 font-mono text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground font-semibold font-sans">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>Bagaimana cara melihat browser berjalan?</span>
              </div>
              <p className="font-sans text-xs text-foreground/80 leading-normal">
                1. <strong>Mode Host Local (<code className="text-sky-400">npm run dev</code>):</strong> Saat menjalankan workflow dengan <code className="text-primary">headless: false</code>, jendela browser Chrome akan otomatis terbuka langsung di desktop Windows Anda.
              </p>
              <p className="font-sans text-xs text-foreground/80 leading-normal">
                2. <strong>Mode Docker Container:</strong> Untuk melihat live stream via web VNC ini, jalankan seluruh service di Docker:
              </p>
              <div className="p-2 rounded bg-black/60 border border-border text-emerald-400 select-all font-mono text-[11px]">
                docker compose up --build
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button size="sm" variant="outline" onClick={() => checkVnc()} className="text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Cek Ulang Koneksi
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setForceIframe(true)} className="text-xs text-muted-foreground hover:text-foreground">
                Tetap buka iframe (Abaikan warning)
              </Button>
            </div>
          </div>
        ) : vncUrl ? (
          <iframe
            key={key}
            src={vncUrl}
            className="w-full h-full border-0"
            title="Playwright Container VNC"
            allow="fullscreen; clipboard-read; clipboard-write"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Connecting to VNC server...
          </div>
        )}
      </div>
    </div>
  );
}
