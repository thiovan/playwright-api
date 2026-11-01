import React, { useState, useEffect } from 'react';
import { Sliders, Monitor, Video, Zap, Bug, Globe, Shield, RefreshCw, Cpu, MousePointer } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import type { WorkflowConfig } from '../../types';

interface WorkflowConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WorkflowConfig;
  onSave: (config: WorkflowConfig) => void;
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  headless: true,
  recordVideo: false,
  noMedia: false,
  debug: true,
  humanize: true,
  gpuVendor: 'Google Inc. (NVIDIA)',
  gpuRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  viewport: { width: 1280, height: 720 },
  userAgent: '',
  proxy: { server: '', username: '', password: '' },
};

export function WorkflowConfigModal({
  open,
  onOpenChange,
  config,
  onSave,
}: WorkflowConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<WorkflowConfig>(DEFAULT_WORKFLOW_CONFIG);

  useEffect(() => {
    if (open) {
      setLocalConfig({
        headless: config.headless !== false,
        recordVideo: Boolean(config.recordVideo),
        noMedia: Boolean(config.noMedia),
        debug: config.debug !== false,
        humanize: config.humanize !== false,
        gpuVendor: config.gpuVendor !== undefined ? config.gpuVendor : 'Google Inc. (NVIDIA)',
        gpuRenderer: config.gpuRenderer !== undefined ? config.gpuRenderer : 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        viewport: {
          width: config.viewport?.width || 1280,
          height: config.viewport?.height || 720,
        },
        userAgent: config.userAgent || '',
        proxy: {
          server: config.proxy?.server || '',
          username: config.proxy?.username || '',
          password: config.proxy?.password || '',
        },
      });
    }
  }, [open, config]);

  const handleApply = () => {
    const cleanProxy = localConfig.proxy?.server?.trim()
      ? {
          server: localConfig.proxy.server.trim(),
          username: localConfig.proxy.username?.trim() || undefined,
          password: localConfig.proxy.password?.trim() || undefined,
        }
      : undefined;

    const payload: WorkflowConfig = {
      headless: localConfig.headless,
      recordVideo: localConfig.recordVideo,
      noMedia: localConfig.noMedia,
      debug: localConfig.debug,
      humanize: localConfig.humanize !== false,
      gpuVendor: localConfig.gpuVendor?.trim() || undefined,
      gpuRenderer: localConfig.gpuRenderer?.trim() || undefined,
      viewport: {
        width: Number(localConfig.viewport?.width) || 1280,
        height: Number(localConfig.viewport?.height) || 720,
      },
      userAgent: localConfig.userAgent?.trim() || undefined,
      proxy: cleanProxy,
    };

    onSave(payload);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_WORKFLOW_CONFIG);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClose={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" /> Global Workflow Configuration
        </DialogTitle>
        <DialogDescription>
          Configure default runtime execution parameters applied to export, templates, and runner.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2 text-xs">
        {/* Execution & Browser Display */}
        <div className="rounded-lg border border-border/70 p-3.5 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-primary" /> Headless Mode (headless)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Run browser in background. Set to false to render display on Xvfb for Live VNC stream.
              </p>
            </div>
            <Switch
              checked={localConfig.headless ?? true}
              onCheckedChange={(val) => setLocalConfig((prev) => ({ ...prev, headless: val }))}
            />
          </div>

          <div className="h-px bg-border/50" />

          {/* Human Simulation */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <MousePointer className="w-3.5 h-3.5 text-primary" /> Human Simulation (humanize)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Cubic Bézier curve mouse movement and randomized 50–150ms keystroke typing delay.
              </p>
            </div>
            <Switch
              checked={localConfig.humanize !== false}
              onCheckedChange={(val) => setLocalConfig((prev) => ({ ...prev, humanize: val }))}
            />
          </div>

          <div className="h-px bg-border/50" />

          {/* Record Video */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-primary" /> Screen Recording (recordVideo)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Save video session (.webm) to recordings folder. Automatically active if headless is false.
              </p>
            </div>
            <Switch
              checked={Boolean(localConfig.recordVideo || !localConfig.headless)}
              disabled={!localConfig.headless}
              onCheckedChange={(val) => setLocalConfig((prev) => ({ ...prev, recordVideo: val }))}
            />
          </div>

          <div className="h-px bg-border/50" />

          {/* noMedia */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Block Images & Media (noMedia)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Aborts image, font, media, and fetch requests for 3-5x faster scraping speed.
              </p>
            </div>
            <Switch
              checked={Boolean(localConfig.noMedia)}
              onCheckedChange={(val) => setLocalConfig((prev) => ({ ...prev, noMedia: val }))}
            />
          </div>

          <div className="h-px bg-border/50" />

          {/* debug */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5 text-emerald-500" /> Debug Output (debug)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Includes per-step action execution log and preserves internal variables prefixed with `_`.
              </p>
            </div>
            <Switch
              checked={localConfig.debug !== false}
              onCheckedChange={(val) => setLocalConfig((prev) => ({ ...prev, debug: val }))}
            />
          </div>
        </div>

        {/* Anti-Bot & WebGL GPU Spoofing */}
        <div className="rounded-lg border border-border/70 p-3.5 space-y-2.5 bg-muted/20">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-foreground flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" /> WebGL GPU Spoofing (Anti-Bot)
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">Bypass llvmpipe / SwiftShader</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">UNMASKED_VENDOR_WEBGL (gpuVendor)</span>
              <Input
                value={localConfig.gpuVendor || ''}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, gpuVendor: e.target.value }))}
                placeholder="Google Inc. (NVIDIA)"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">UNMASKED_RENDERER_WEBGL (gpuRenderer)</span>
              <Input
                value={localConfig.gpuRenderer || ''}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, gpuRenderer: e.target.value }))}
                placeholder="ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Viewport Dimensions */}
        <div className="rounded-lg border border-border/70 p-3.5 space-y-2.5 bg-muted/20">
          <label className="font-semibold text-foreground block">Viewport Dimensions (viewport)</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">Width (px)</span>
              <Input
                type="number"
                value={localConfig.viewport?.width ?? 1280}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    viewport: {
                      width: Number(e.target.value) || 1280,
                      height: prev.viewport?.height || 720,
                    },
                  }))
                }
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">Height (px)</span>
              <Input
                type="number"
                value={localConfig.viewport?.height ?? 720}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    viewport: {
                      width: prev.viewport?.width || 1280,
                      height: Number(e.target.value) || 720,
                    },
                  }))
                }
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Custom User-Agent */}
        <div className="rounded-lg border border-border/70 p-3.5 space-y-2.5 bg-muted/20">
          <label className="font-semibold text-foreground flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" /> Custom User-Agent (userAgent)
          </label>
          <Input
            value={localConfig.userAgent || ''}
            onChange={(e) => setLocalConfig((prev) => ({ ...prev, userAgent: e.target.value }))}
            placeholder="e.g. Mozilla/5.0 (Windows NT 10.0; Win64; x64)... (leave empty for default)"
            className="h-8 text-xs font-mono"
          />
        </div>

        {/* Proxy Settings */}
        <div className="rounded-lg border border-border/70 p-3.5 space-y-2.5 bg-muted/20">
          <label className="font-semibold text-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" /> HTTP / SOCKS Proxy (proxy)
          </label>
          <div className="space-y-2">
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">Proxy Server URL</span>
              <Input
                value={localConfig.proxy?.server || ''}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    proxy: { ...prev.proxy, server: e.target.value },
                  }))
                }
                placeholder="http://127.0.0.1:8080 or socks5://host:1080"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Username (optional)</span>
                <Input
                  value={localConfig.proxy?.username || ''}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      proxy: { ...prev.proxy, username: e.target.value },
                    }))
                  }
                  placeholder="proxyuser"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Password (optional)</span>
                <Input
                  type="password"
                  value={localConfig.proxy?.password || ''}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      proxy: { ...prev.proxy, password: e.target.value },
                    }))
                  }
                  placeholder="••••••••"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
        <Button size="sm" variant="ghost" onClick={handleReset} className="text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3 mr-1.5" /> Reset Defaults
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply}>
            Save Configuration
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
