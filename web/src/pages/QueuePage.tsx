import React, { useState, useEffect } from 'react';
import {
  ListOrdered,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Monitor,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Video,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { formatDate, formatDuration } from '../lib/utils';
import type { RequestRecord, QueueCounts } from '../types';

interface QueuePageProps {
  onSelectRequest: (id: string) => void;
  onOpenVnc: () => void;
}

export function QueuePage({ onSelectRequest, onOpenVnc }: QueuePageProps) {
  const [items, setItems] = useState<RequestRecord[]>([]);
  const [queueCounts, setQueueCounts] = useState<QueueCounts | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const limit = 20;

  const loadData = async () => {
    setLoading(true);
    try {
      const [hist, stats] = await Promise.all([
        api.getHistory(page, limit),
        api.getStats(),
      ]);
      setItems(hist.items || []);
      setTotal(hist.total || 0);
      setQueueCounts(stats.queue);
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
  }, [page]);

  const filteredItems = items.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return item.id.toLowerCase().includes(q) || item.type.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Queue & Execution History</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Browse real-time BullMQ queues and historical execution traces
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Queue Status Pills */}
      {queueCounts && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active Processing:</span>
            <Badge variant="default" className="font-mono text-xs">{queueCounts.active}</Badge>
          </div>
          <div className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">BullMQ Waiting:</span>
            <Badge variant="warning" className="font-mono text-xs">{queueCounts.waiting}</Badge>
          </div>
          <div className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Completed:</span>
            <Badge variant="success" className="font-mono text-xs">{queueCounts.completed}</Badge>
          </div>
          <div className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Failed:</span>
            <Badge variant="destructive" className="font-mono text-xs">{queueCounts.failed}</Badge>
          </div>
          <div className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Delayed:</span>
            <Badge variant="outline" className="font-mono text-xs">{queueCounts.delayed}</Badge>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by Request ID or Type..."
              className="pl-8 text-xs h-8"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
            <span className="text-muted-foreground text-[11px] mr-1 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> Status:
            </span>
            {['all', 'running', 'success', 'failed'].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={filterStatus === st ? 'default' : 'outline'}
                className="h-7 px-2.5 text-xs capitalize"
                onClick={() => setFilterStatus(st)}
              >
                {st}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-semibold">Request ID</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Duration</th>
                  <th className="py-3 px-4 font-semibold">Started At</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No matching executions found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => onSelectRequest(req.id)}
                      className="hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-foreground">{req.id}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{req.type.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {formatDuration(req.duration)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(req.startedAt)}</td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                          {req.status === 'running' && req.config?.headless === false && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[11px] text-sky-400"
                              onClick={onOpenVnc}
                            >
                              <Monitor className="w-3 h-3 mr-1" /> VNC
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing {filteredItems.length} of {total} records (Page {page} of {totalPages})
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="font-mono px-2">{page}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

