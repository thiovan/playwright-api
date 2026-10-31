import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../components/ui/Dialog';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useToast, useConfirm } from '../context/NotificationContext';
import type { ApiKey } from '../types';

export function ApiKeysPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyDesc, setKeyDesc] = useState('');
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const data = await api.getKeys();
      setKeys(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreate = async () => {
    if (!keyName.trim()) return;
    try {
      const newKey = await api.createKey(keyName, keyDesc);
      setCreatedKey(newKey);
      setCreateModalOpen(false);
      setKeyName('');
      setKeyDesc('');
      loadKeys();
      toast.success('API key generated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create API key');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await api.toggleKey(id, active);
      loadKeys();
      toast.info(active ? 'API key activated' : 'API key revoked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update key status');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete API Key',
      message: 'Are you sure you want to permanently delete this API key? External clients using it will lose access immediately.',
      confirmText: 'Delete Key',
      variant: 'destructive',
    });
    if (!ok) return;

    try {
      await api.deleteKey(id);
      loadKeys();
      toast.success('API key permanently deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete API key');
    }
  };

  const copyToClipboard = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const hasActiveKeys = keys.some(k => k.active);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Key Management</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Authenticate and authorize external microservices and third-party applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadKeys} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create API Key
          </Button>
        </div>
      </div>

      {/* Security Adaptive Banner */}
      <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
        hasActiveKeys
          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
          : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
      }`}>
        {hasActiveKeys ? (
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className="text-xs leading-relaxed">
          {hasActiveKeys ? (
            <>
              <span className="font-semibold text-emerald-400">Adaptive API Protection Active: </span>
              Active API keys are configured. All calls to <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[11px]">POST /api/v1/sync</code> and <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[11px]">POST /api/v1/async</code> now require the <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[11px]">x-api-key: &lt;key&gt;</code> header.
            </>
          ) : (
            <>
              <span className="font-semibold text-amber-400">Open Access Mode: </span>
              No active API keys are registered in Redis. API execution endpoints are currently open without authentication. Once you create your first key, automatic enforcement will activate.
            </>
          )}
        </div>
      </div>

      {/* API Keys Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-semibold">Key Name</th>
                  <th className="py-3 px-4 font-semibold">Token Prefix</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold">Last Used</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No API keys registered yet. Click "Create API Key" above to generate one.
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{k.name}</div>
                        {k.description && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">{k.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <code className="px-2 py-1 rounded bg-muted font-mono text-primary text-[11px]">
                          {k.prefix}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={k.active ? 'success' : 'outline'}>
                          {k.active ? 'ACTIVE' : 'REVOKED'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(k.createdAt)}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{k.active ? 'Active' : 'Disabled'}</span>
                            <Switch
                              checked={k.active}
                              onCheckedChange={(val) => handleToggle(k.id, val)}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(k.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Key Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogClose onClose={() => setCreateModalOpen(false)} />
        <DialogHeader>
          <DialogTitle>Generate New API Key</DialogTitle>
          <DialogDescription>
            Create an access token for client applications to trigger Playwright workflows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Key Name</label>
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Production Mobile Backend"
              className="mt-1 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Description (Optional)</label>
            <Input
              value={keyDesc}
              onChange={(e) => setKeyDesc(e.target.value)}
              placeholder="e.g. Scrapes pricing data every hour"
              className="mt-1 text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={!keyName.trim()}>
            Generate Token
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Show Newly Generated Token Dialog */}
      <Dialog open={Boolean(createdKey)} onOpenChange={() => setCreatedKey(null)}>
        <DialogClose onClose={() => setCreatedKey(null)} />
        <DialogHeader>
          <DialogTitle className="text-emerald-400 flex items-center gap-2">
            <Check className="w-5 h-5" /> API Key Generated Successfully
          </DialogTitle>
          <DialogDescription>
            Make sure to copy your API key now. You will not be able to see it again!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="p-3 rounded-lg bg-black/60 border border-border flex items-center justify-between gap-3 font-mono text-xs text-primary">
            <span className="truncate">{createdKey?.rawKey}</span>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-7 text-xs"
              onClick={() => copyToClipboard(createdKey?.rawKey)}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy Key'}
            </Button>
          </div>

          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">
            <span className="font-semibold">Example Usage:</span>
            <pre className="mt-1 p-2 rounded bg-black/40 font-mono text-[11px] overflow-x-auto text-muted-foreground">
              curl -X POST http://localhost:3000/api/v1/sync \<br />
              &nbsp;&nbsp;-H "x-api-key: {createdKey?.rawKey}" \<br />
              &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
              &nbsp;&nbsp;-d '&#123; "workflow": [...] &#125;'
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" onClick={() => setCreatedKey(null)}>
            I have saved this key
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

