import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  FolderKanban,
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
import type { ScheduleRecord, WorkflowTemplate } from '../types';

export function SchedulesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [cronPreset, setCronPreset] = useState('0 * * * *');
  const [customCron, setCustomCron] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        api.getSchedules(),
        api.getTemplates(),
      ]);
      setSchedules(s);
      setTemplates(t);
      if (t.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(t[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const cron = cronPreset === 'custom' ? customCron : cronPreset;

    try {
      await api.createSchedule({
        name,
        templateId: selectedTemplateId || null,
        cron,
        payload: {
          config: { headless: true, viewport: { width: 1280, height: 720 } },
          webhook_url: webhookUrl || null,
        },
      });
      setModalOpen(false);
      setName('');
      loadData();
      toast.success('Schedule created successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create schedule');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await api.toggleSchedule(id, active);
      loadData();
      toast.info(active ? 'Schedule resumed' : 'Schedule paused');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update schedule status');
    }
  };

  const handleTriggerNow = async (id: string) => {
    try {
      const res = await api.triggerSchedule(id);
      toast.success(`Schedule enqueued as Job ${res.jobId}`, 'Triggered Manually');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger schedule');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Schedule',
      message: 'Are you sure you want to permanently delete this scheduled job?',
      confirmText: 'Delete Schedule',
      variant: 'destructive',
    });
    if (!ok) return;

    try {
      await api.deleteSchedule(id);
      loadData();
      toast.success('Schedule deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete schedule');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scheduled Runs</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Automate recurring browser tasks using BullMQ repeatable jobs and Cron expressions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add New Schedule
          </Button>
        </div>
      </div>

      {/* Schedules Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-semibold">Schedule Name</th>
                  <th className="py-3 px-4 font-semibold">Frequency (Cron)</th>
                  <th className="py-3 px-4 font-semibold">Target Workflow</th>
                  <th className="py-3 px-4 font-semibold">Last Execution</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No automated schedules configured. Click "Add New Schedule" to create a cron workflow.
                    </td>
                  </tr>
                ) : (
                  schedules.map((sch) => {
                    const tpl = templates.find(t => t.id === sch.templateId);
                    return (
                      <tr key={sch.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{sch.name}</div>
                          <span className="font-mono text-[10px] text-muted-foreground">{sch.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <code className="px-2 py-0.5 rounded bg-muted font-mono text-[11px] text-primary">
                            {sch.cron || (sch.every ? `Every ${sch.every / 1000}s` : 'Hourly')}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-foreground/90">
                          {tpl ? tpl.name : 'Custom Workflow'}
                        </td>
                        <td className="py-3 px-4">
                          {sch.lastRunAt ? (
                            <div className="flex items-center gap-1.5">
                              {sch.lastStatus === 'success' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-destructive" />
                              )}
                              <span>{formatDate(sch.lastRunAt)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Never triggered</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={sch.active}
                              onCheckedChange={(val) => handleToggle(sch.id, val)}
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {sch.active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTriggerNow(sch.id)}
                              className="h-7 text-xs px-2"
                              title="Trigger manual run immediately"
                            >
                              <Play className="w-3 h-3 mr-1 fill-current" /> Run Now
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(sch.id)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Schedule Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogClose onClose={() => setModalOpen(false)} />
        <DialogHeader>
          <DialogTitle>Create Scheduled Automation</DialogTitle>
          <DialogDescription>
            Configure repeatable workflow jobs executed automatically by the background worker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Schedule Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily Pricing Scraping"
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Workflow Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-input bg-background/50 px-3 text-xs"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.workflow?.length || 0} steps)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Execution Frequency</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { label: 'Every 5 Minutes', cron: '*/5 * * * *' },
                { label: 'Every Hour', cron: '0 * * * *' },
                { label: 'Daily at 9:00 AM', cron: '0 9 * * *' },
                { label: 'Custom Cron', cron: 'custom' },
              ].map(opt => (
                <button
                  key={opt.cron}
                  type="button"
                  onClick={() => setCronPreset(opt.cron)}
                  className={`p-2 rounded border text-xs text-left transition-colors ${
                    cronPreset === opt.cron
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border bg-muted/20 text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {cronPreset === 'custom' && (
              <div className="mt-2">
                <Input
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="* * * * * (Standard 5-part cron)"
                  className="text-xs font-mono"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Webhook URL (Optional)</label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://api.mydomain.com/webhooks/playwright"
              className="mt-1 text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Worker delivers execution results payload to this endpoint once finished.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={!name.trim()}>
            Register Schedule
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

