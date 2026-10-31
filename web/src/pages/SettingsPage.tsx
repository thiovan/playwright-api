import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  CheckCircle2,
  AlertCircle,
  Save,
  Activity,
  Monitor,
  Cpu,
  RefreshCw,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import { api } from '../lib/api';
import { useToast } from '../context/NotificationContext';
import type { ConfigStatus } from '../types';

export function SettingsPage() {
  const toast = useToast();
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [redisHost, setRedisHost] = useState('');
  const [redisPort, setRedisPort] = useState('6379');
  const [redisPassword, setRedisPassword] = useState('');
  const [redisTls, setRedisTls] = useState(false);

  const [concurrency, setConcurrency] = useState('3');
  const [vncHost, setVncHost] = useState('localhost');
  const [vncPort, setVncPort] = useState('8080');

  // Test status
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getConfigStatus();
      setStatus(data);
      if (data.redis) {
        setRedisHost(data.redis.host);
        setRedisPort(String(data.redis.port));
        setRedisTls(data.redis.tls);
      }
      if (data.worker) {
        setConcurrency(String(data.worker.concurrency));
      }
      if (data.vnc) {
        setVncHost(data.vnc.host);
        setVncPort(String(data.vnc.port));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTestRedis = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testRedis({
        host: redisHost,
        port: parseInt(redisPort, 10),
        password: redisPassword || undefined,
        tls: redisTls,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await api.saveConfig({
        redisHost,
        redisPort: parseInt(redisPort, 10),
        redisPassword,
        redisTls,
        concurrency: parseInt(concurrency, 10),
        vncHost,
        vncPort: parseInt(vncPort, 10),
      });
      setSaveMessage('Configuration updated and saved to .env file successfully!');
      toast.success('Configuration saved and applied');
      loadStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassMessage(null);

    if (!currentPassword || !newPassword) {
      setPassError('Please enter current and new passwords.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword, newUsername || undefined);
      if (res.success) {
        setPassMessage('Admin credentials updated successfully in Redis!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setNewUsername('');
      } else {
        setPassError(res.error || 'Failed to change password.');
      }
    } catch (err: any) {
      setPassError(err.message || 'Error communicating with server.');
    } finally {
      setChangingPass(false);
    }
  };

  const isConnected = status?.redis?.status === 'connected';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quick Setup & Environment Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Configure external Redis services, runtime concurrency, and dashboard security
        </p>
      </div>

      {saveMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Admin Security Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Dashboard Admin Security</CardTitle>
              <CardDescription>
                Update dashboard login password and administrative username (stored encrypted in Redis)
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleChangePassword}>
          <CardContent className="space-y-4">
            {passMessage && (
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{passMessage}</span>
              </div>
            )}
            {passError && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  New Username (Optional)
                </label>
                <Input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Keep current username"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  New Password
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 5 characters"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-border pt-4 bg-muted/10">
            <Button size="sm" type="submit" disabled={changingPass}>
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              {changingPass ? 'Updating...' : 'Update Admin Credentials'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Redis Connection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Redis Broker Configuration</CardTitle>
                <CardDescription>
                  Manages BullMQ job queues, execution history, and persistent API key storage
                </CardDescription>
              </div>
            </div>

            <Badge variant={isConnected ? 'success' : 'destructive'} className="gap-1">
              {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {isConnected ? 'ONLINE & CONNECTED' : 'CONNECTION ERROR'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Redis Host / IP Address
              </label>
              <Input
                value={redisHost}
                onChange={(e) => setRedisHost(e.target.value)}
                placeholder="redis (local container) or 192.168.x.x / host.com"
                className="mt-1 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Port</label>
              <Input
                value={redisPort}
                onChange={(e) => setRedisPort(e.target.value)}
                placeholder="6379"
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Redis Password (Optional)
              </label>
              <Input
                type="password"
                value={redisPassword}
                onChange={(e) => setRedisPassword(e.target.value)}
                placeholder="Leave blank if no auth"
                className="mt-1 font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50 self-end h-[38px]">
              <span className="text-xs font-medium">Use TLS / SSL Connection</span>
              <Switch checked={redisTls} onCheckedChange={setRedisTls} />
            </div>
          </div>

          {/* Test connection result banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                testResult.success
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                <span>
                  {testResult.success
                    ? `Ping successful! Response: ${testResult.response} (Latency: ${testResult.latencyMs}ms, Version: ${testResult.version})`
                    : `Connection failed: ${testResult.error}`}
                </span>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/10">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestRedis}
            disabled={testing}
          >
            {testing ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1.5 text-primary" />}
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Configuration & Reconnect'}
          </Button>
        </CardFooter>
      </Card>

      {/* Worker & Concurrency Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Worker Concurrency & Display</CardTitle>
              <CardDescription>
                Configure multi-instance parallel browsers and remote VNC viewer settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Worker Concurrency (N instances)
              </label>
              <Input
                type="number"
                value={concurrency}
                onChange={(e) => setConcurrency(e.target.value)}
                placeholder="3"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Number of isolated browser instances running concurrently.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                VNC Host
              </label>
              <Input
                value={vncHost}
                onChange={(e) => setVncHost(e.target.value)}
                placeholder="localhost"
                className="mt-1 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                VNC Port (noVNC Web)
              </label>
              <Input
                value={vncPort}
                onChange={(e) => setVncPort(e.target.value)}
                placeholder="8080"
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end border-t border-border pt-4 bg-muted/10">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save Parameters
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
