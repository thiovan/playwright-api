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
  ChevronDown,
  ChevronUp,
  Sliders,
  Zap,
  Bug,
  Globe,
  Shield,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';
import { VideoPlayer } from '../VideoPlayer';
import { api } from '../../lib/api';
import type { ApiKey, WorkflowConfig } from '../../types';

interface RunnerModalProps {
  open: boolean;
  onClose: () => void;
  workflow: any[];
  onOpenVnc: () => void;
  initialConfig?: WorkflowConfig;
}

export function RunnerModal({ open, onClose, workflow, onOpenVnc, initialConfig }: RunnerModalProps) {
  const [headless, setHeadless] = useState(true);
  const [recordVideo, setRecordVideo] = useState(false);
  const [noMedia, setNoMedia] = useState(false);
  const [debug, setDebug] = useState(true);
  const [humanize, setHumanize] = useState(true);
  const [gpuVendor, setGpuVendor] = useState('Google Inc. (NVIDIA)');
  const [gpuRenderer, setGpuRenderer] = useState('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)');
  const [workflowTimeout, setWorkflowTimeout] = useState<number>(300000);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [userAgent, setUserAgent] = useState('');
  const [proxyServer, setProxyServer] = useState('');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      if (initialConfig) {
        setHeadless(initialConfig.headless !== false);
        setRecordVideo(Boolean(initialConfig.recordVideo));
        setNoMedia(Boolean(initialConfig.noMedia));
        setDebug(initialConfig.debug !== false);
        setHumanize(initialConfig.humanize !== false);
        setGpuVendor(initialConfig.gpuVendor !== undefined ? initialConfig.gpuVendor : 'Google Inc. (NVIDIA)');
        setGpuRenderer(initialConfig.gpuRenderer !== undefined ? initialConfig.gpuRenderer : 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)');
        setWorkflowTimeout(initialConfig.workflowTimeout !== undefined ? initialConfig.workflowTimeout : 300000);
        setViewportWidth(initialConfig.viewport?.width || 1280);
        setViewportHeight(initialConfig.viewport?.height || 720);
        setUserAgent(initialConfig.userAgent || '');
        setProxyServer(initialConfig.proxy?.server || '');
        setProxyUsername(initialConfig.proxy?.username || '');
        setProxyPassword(initialConfig.proxy?.password || '');
      }
      api.getKeys().then(k => {
        setKeys(k.filter(x => x.active));
      }).catch(() => {});
      setResult(null);
      setDuration(null);
    }
  }, [open, initialConfig]);

  if (!open) return null;

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setDuration(null);

    const startTime = Date.now();
    const cleanProxy = proxyServer.trim()
      ? {
          server: proxyServer.trim(),
          username: proxyUsername.trim() || undefined,
          password: proxyPassword.trim() || undefined,
        }
      : undefined;

    const payload: any = {
      config: {
        headless,
        recordVideo: !headless || recordVideo,
        noMedia,
        debug,
        humanize,
        workflowTimeout: workflowTimeout ? Number(workflowTimeout) : undefined,
        gpuVendor: gpuVendor.trim() || undefined,
        gpuRenderer: gpuRenderer.trim() || undefined,
        viewport: { width: Number(viewportWidth) || 1280, height: Number(viewportHeight) || 720 },
        userAgent: userAgent.trim() || undefined,
        proxy: cleanProxy,
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
      <div className="relative z-50 w-full max-w-3xl h-[88vh] rounded-xl border border-border bg-card flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20 shrink-0">
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

        {/* Primary Configuration Bar */}
        <div className="p-4 border-b border-border bg-muted/10 shrink-0 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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

          {/* Toggle for Advanced Parameters */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium select-none"
            >
              <Sliders className="w-3.5 h-3.5" />
              {showAdvanced ? 'Hide Advanced Config (noMedia, debug, proxy)' : 'Show Advanced Config (noMedia, debug, proxy, viewport)'}
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {noMedia && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">noMedia</Badge>}
              {!debug && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">debug: off</Badge>}
              {!humanize && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">humanize: off</Badge>}
              {proxyServer && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">proxy</Badge>}
            </div>
          </div>

          {/* Collapsible Advanced Parameters */}
          {showAdvanced && (
            <div className="p-3 rounded-lg border border-border/70 bg-card/60 space-y-3 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2 rounded border border-border/50 bg-background/50">
                  <div className="space-y-0.5 pr-2">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" /> Block Media (noMedia)
                    </span>
                    <p className="text-[10px] text-muted-foreground">Aborts images, fonts, media for faster scraping</p>
                  </div>
                  <Switch checked={noMedia} onCheckedChange={(v) => setNoMedia(v)} />
                </div>

                <div className="flex items-center justify-between p-2 rounded border border-border/50 bg-background/50">
                  <div className="space-y-0.5 pr-2">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Bug className="w-3 h-3 text-emerald-500" /> Debug Output (debug)
                    </span>
                    <p className="text-[10px] text-muted-foreground">Includes action results & internal variables</p>
                  </div>
                  <Switch checked={debug} onCheckedChange={(v) => setDebug(v)} />
                </div>

                <div className="col-span-1 sm:col-span-2 flex items-center justify-between p-2 rounded border border-border/50 bg-background/50">
                  <div className="space-y-0.5 pr-2">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-primary" /> Human Simulation (humanize)
                    </span>
                    <p className="text-[10px] text-muted-foreground">Bézier curve mouse trajectory and randomized 50–150ms typing delay</p>
                  </div>
                  <Switch checked={humanize} onCheckedChange={(v) => setHumanize(v)} />
                </div>
              </div>

              <div className="p-2 rounded border border-border/50 bg-background/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" /> Max Workflow Timeout (workflowTimeout)
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {workflowTimeout ? `${Math.round(workflowTimeout / 1000)}s` : 'unlimited'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={workflowTimeout}
                    onChange={(e) => setWorkflowTimeout(Number(e.target.value))}
                    placeholder="300000"
                    className="h-7 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">ms</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setWorkflowTimeout(60000)}
                      className="px-1.5 py-0.5 rounded text-[9px] bg-muted hover:bg-muted/80 text-muted-foreground"
                    >
                      1m
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkflowTimeout(300000)}
                      className="px-1.5 py-0.5 rounded text-[9px] bg-muted hover:bg-muted/80 text-muted-foreground"
                    >
                      5m
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkflowTimeout(600000)}
                      className="px-1.5 py-0.5 rounded text-[9px] bg-muted hover:bg-muted/80 text-muted-foreground"
                    >
                      10m
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40">
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">WebGL Vendor (gpuVendor)</label>
                  <Input
                    value={gpuVendor}
                    onChange={(e) => setGpuVendor(e.target.value)}
                    placeholder="Google Inc. (NVIDIA)"
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">WebGL Renderer (gpuRenderer)</label>
                  <Input
                    value={gpuRenderer}
                    onChange={(e) => setGpuRenderer(e.target.value)}
                    placeholder="ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/40">
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Viewport Width</label>
                  <Input
                    type="number"
                    value={viewportWidth}
                    onChange={(e) => setViewportWidth(Number(e.target.value) || 1280)}
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Viewport Height</label>
                  <Input
                    type="number"
                    value={viewportHeight}
                    onChange={(e) => setViewportHeight(Number(e.target.value) || 720)}
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Custom User-Agent</label>
                  <Input
                    value={userAgent}
                    onChange={(e) => setUserAgent(e.target.value)}
                    placeholder="Leave empty for default"
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/40">
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Proxy Server</label>
                  <Input
                    value={proxyServer}
                    onChange={(e) => setProxyServer(e.target.value)}
                    placeholder="http://host:port"
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Proxy User</label>
                  <Input
                    value={proxyUsername}
                    onChange={(e) => setProxyUsername(e.target.value)}
                    placeholder="Username"
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Proxy Pass</label>
                  <Input
                    type="password"
                    value={proxyPassword}
                    onChange={(e) => setProxyPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mode specifics */}
        {mode === 'async' && (
          <div className="px-5 py-2.5 bg-muted/5 border-b border-border flex items-center gap-3 text-xs shrink-0">
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
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
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
