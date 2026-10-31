import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Camera,
  X,
  ExternalLink,
  Video,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';
import { VideoPlayer } from '../VideoPlayer';
import { api } from '../../lib/api';
import type { ApiKey } from '../../types';

interface RunnerModalProps {
  open: boolean;
  onClose: () => void;
  workflow: any[];
  onOpenVnc: () => void;
}

export function RunnerModal({ open, onClose, workflow, onOpenVnc }: RunnerModalProps) {
  const [headless, setHeadless] = useState(true);
  const [recordVideo, setRecordVideo] = useState(true);
  const [mode, setMode] = useState<'sync' | 'async'>('sync');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [customKey, setCustomKey] = useState<string>('');

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      api.getKeys().then(k => {
        setKeys(k.filter(x => x.active));
      }).catch(() => {});
      setResult(null);
      setDuration(null);
    }
  }, [open]);

  if (!open) return null;

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setDuration(null);

    const startTime = Date.now();
    const payload: any = {
      config: {
        headless,
        recordVideo: !headless || recordVideo,
        viewport: { width: 1280, height: 720 },
      },
      workflow,
    };

    if (mode === 'async') {
      payload.webhook_url = webhookUrl || 'https://httpbin.org/post';
    }

    const keyToUse = customKey || selectedKey || undefined;

    try {
      let res;
      if (mode === 'sync') {
        res = await api.executeSync(payload, keyToUse);
      } else {
        res = await api.executeAsync(payload, keyToUse);
      }
      setDuration(Date.now() - startTime);
      setResult(res);
    } catch (err: any) {
      setDuration(Date.now() - startTime);
      setResult({ success: false, error: err.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-3xl h-[85vh] rounded-xl border border-border bg-card flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" /> Test & Execute Workflow
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Execute {workflow.length} workflow action(s) against the Playwright engine
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Configuration Bar */}
        <div className="p-5 border-b border-border bg-muted/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-semibold text-muted-foreground block mb-1">Execution Mode</label>
            <div className="flex rounded-md border border-border p-0.5 bg-background">
              <button
                className={`flex-1 py-1 rounded text-center font-medium ${mode === 'sync' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                onClick={() => setMode('sync')}
              >
                Sync
              </button>
              <button
                className={`flex-1 py-1 rounded text-center font-medium ${mode === 'async' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                onClick={() => setMode('async')}
              >
                Async
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-muted-foreground block mb-1">Browser Display</label>
            <div className="flex items-center justify-between h-8 px-2 rounded-md border border-border bg-background">
              <span>{headless ? 'Headless' : 'Visible (VNC)'}</span>
              <Switch checked={!headless} onCheckedChange={(val) => setHeadless(!val)} />
            </div>
          </div>

          <div>
            <label className="font-semibold text-muted-foreground block mb-1">Record Screen</label>
            <div className="flex items-center justify-between h-8 px-2 rounded-md border border-border bg-background">
              <span>{recordVideo || !headless ? 'Enabled' : 'Disabled'}</span>
              <Switch checked={recordVideo || !headless} onCheckedChange={(v) => setRecordVideo(v)} />
            </div>
          </div>

          <div>
            <label className="font-semibold text-muted-foreground block mb-1">Live VNC</label>
            <Button
              size="sm"
              variant="outline"
              disabled={headless}
              onClick={onOpenVnc}
              className="w-full h-8 text-xs font-normal"
            >
              <Eye className="w-3.5 h-3.5 mr-1 text-primary" /> Open VNC
            </Button>
          </div>
        </div>

        {/* Mode specifics */}
        {mode === 'async' && (
          <div className="px-5 py-2.5 bg-muted/5 border-b border-border flex items-center gap-3 text-xs">
            <span className="font-semibold text-muted-foreground shrink-0">Webhook URL:</span>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://client-domain.com/callback"
              className="h-7 text-xs font-mono"
            />
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-5 font-mono text-xs">
          {running ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <RotateCw className="w-8 h-8 animate-spin text-primary" />
              <p className="font-sans text-sm">Executing workflow steps on Playwright...</p>
              {!headless && (
                <Button size="sm" variant="outline" onClick={onOpenVnc} className="mt-2 text-xs font-sans">
                  Watch live via VNC viewer
                </Button>
              )}
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="w-3 h-3" /> SUCCESS
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" /> FAILED
                    </Badge>
                  )}
                  {duration !== null && (
                    <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {(duration / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>

                {result.recording && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs font-sans text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
                    onClick={() => window.open(result.recording.url, '_blank')}
                  >
                    <Video className="w-3.5 h-3.5 mr-1" /> Open Video (.webm)
                  </Button>
                )}
              </div>

              {result.recording && (
                <div className="space-y-1.5 font-sans">
                  <div className="text-muted-foreground font-semibold text-xs">Screen Recording:</div>
                  <VideoPlayer url={result.recording.url} filename={result.recording.filename} />
                </div>
              )}

              {result.error && (
                <div className="p-3 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                  {result.error}
                </div>
              )}

              {/* Screenshots preview */}
              {result.results?.some((r: any) => r.data?.screenshot) && (
                <div>
                  <div className="text-muted-foreground font-sans font-semibold mb-2">Screenshots:</div>
                  <div className="flex flex-wrap gap-3">
                    {result.results
                      .filter((r: any) => r.data?.screenshot)
                      .map((r: any, idx: number) => (
                        <img
                          key={idx}
                          src={`data:image/png;base64,${r.data.screenshot}`}
                          alt="Screenshot"
                          className="max-w-xs rounded border border-border shadow"
                        />
                      ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-muted-foreground font-sans font-semibold mb-1">Execution Response:</div>
                <pre className="p-3 rounded bg-black/60 border border-border text-[11px] overflow-x-auto text-emerald-300">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center">
              <Play className="w-10 h-10 text-muted opacity-40 mb-2" />
              <p className="font-sans text-sm">Ready to execute.</p>
              <p className="font-sans text-xs text-muted-foreground mt-1">
                Click "Run Workflow" below to test this sequence.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">
            {workflow.length} step(s) configured
          </span>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRun} disabled={running || workflow.length === 0}>
              {running ? <RotateCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />}
              {running ? 'Running...' : 'Run Workflow'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

