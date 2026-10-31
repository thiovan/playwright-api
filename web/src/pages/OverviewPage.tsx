import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  Play,
  KeyRound,
  Monitor,
  RefreshCw,
  Video,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { formatDate, formatDuration } from '../lib/utils';
import type { DashboardStats, RequestRecord } from '../types';

interface OverviewPageProps {
  onNavigate: (tab: string) => void;
  onSelectRequest: (id: string) => void;
  onOpenVnc: () => void;
}

export function OverviewPage({ onNavigate, onSelectRequest, onOpenVnc }: OverviewPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([
        api.getStats(),
        api.getHistory(1, 8),
      ]);
      setStats(s);
      setRecent(h.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const queue = stats?.queue;
  const history = stats?.history;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Telemetry & Queue</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time Playwright execution concurrency and job lifecycle metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => onNavigate('builder')}>
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Launch Workflow Builder
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card/70 backdrop-blur border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Active Jobs</span>
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-sky-400">
              {queue?.active ?? '-'}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">In Browser Engine</span>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Queue Waiting</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {queue?.waiting ?? '-'}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">BullMQ Pending</span>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {queue?.completed ?? '-'}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">Processed Queue</span>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Queue Failed</span>
              <XCircle className="w-4 h-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold font-mono text-destructive">
              {queue?.failed ?? '-'}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">Errors Encounted</span>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Success Rate</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {history ? `${history.successRate}%` : '-'}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">Lifetime Success</span>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Avg Duration</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-purple-400">
              {history ? formatDuration(history.avgDuration) : '-'}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">Per Execution</span>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Shortcuts Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('builder')}
          className="p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/20 text-primary">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Visual Workflow Builder</h4>
              <p className="text-xs text-muted-foreground">Assemble Playwright steps with drag-and-drop</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
        </div>

        <div
          onClick={onOpenVnc}
          className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Live Browser VNC</h4>
              <p className="text-xs text-muted-foreground">Watch headless=false browsers live in Docker</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-sky-400 group-hover:translate-x-1 transition-transform" />
        </div>

        <div
          onClick={() => onNavigate('keys')}
          className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">API Key Management</h4>
              <p className="text-xs text-muted-foreground">Generate tokens for external application auth</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Recent History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Recent Executions</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Last requests dispatched to the engine</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onNavigate('queue')} className="text-xs">
            View All History <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No executions recorded yet. Launch a test from the builder!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Request ID</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Duration</th>
                    <th className="py-2.5 px-3 font-semibold">Started At</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => onSelectRequest(req.id)}
                      className="hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-medium text-foreground">{req.id}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline">{req.type.toUpperCase()}</Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            req.status === 'success'
                              ? 'success'
                              : req.status === 'failed'
                              ? 'destructive'
                              : 'warning'
                          }
                        >
                          {req.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {formatDuration(req.duration)}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{formatDate(req.startedAt)}</td>
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {(req.recording || req.result?.recording) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[11px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
                              onClick={() => onSelectRequest(req.id)}
                              title="Watch execution recording"
                            >
                              <Video className="w-3 h-3 mr-1" /> Video
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => onSelectRequest(req.id)}
                          >
                            Inspect
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

