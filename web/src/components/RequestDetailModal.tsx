import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  Copy,
  Check,
  Code,
  ListTree,
  Video,
  Monitor,
  Film,
  Download,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { VideoPlayer } from './VideoPlayer';
import { formatDate, formatDuration } from '../lib/utils';
import { api } from '../lib/api';
import type { RequestRecord } from '../types';

interface RequestDetailModalProps {
  requestId: string | null;
  onClose: () => void;
  onOpenVnc?: () => void;
}

export function RequestDetailModal({ requestId, onClose, onOpenVnc }: RequestDetailModalProps) {
  const [data, setData] = useState<RequestRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'steps' | 'variables' | 'video' | 'payload' | 'result'>('steps');

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    api.getHistoryDetail(requestId)
      .then(res => {
        setData(res);
        const rec = res.recording || res.result?.recording;
        if (rec && rec.url) {
          setTab('video');
        } else {
          setTab('steps');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [requestId]);

  if (!requestId) return null;

  const copyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const recording = data?.recording || data?.result?.recording;
  const resultsList = (Array.isArray(data?.results) && data!.results.length > 0)
    ? data!.results
    : (Array.isArray(data?.result?.results) ? data!.result!.results : []);
  const variablesMap = (data?.variables && Object.keys(data.variables).length > 0)
    ? data.variables
    : (data?.result?.variables || {});
  const payloadObj = data?.payload || (data?.workflow || data?.config ? { config: data?.config, workflow: data?.workflow } : null);
  const rawResultObj = data?.rawResult || data?.result || data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-4xl h-[90vh] rounded-xl border border-border bg-card flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-base">{requestId}</span>
                {data && (
                  <Badge
                    variant={
                      data.status === 'success'
                        ? 'success'
                        : data.status === 'failed'
                        ? 'destructive'
                        : 'warning'
                    }
                  >
                    {data.status.toUpperCase()}
                  </Badge>
                )}
                {data && <Badge variant="outline">{data.type.toUpperCase()}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Started {formatDate(data?.startedAt)} • Duration: {formatDuration(data?.duration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recording && (
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
                onClick={() => setTab('video')}
              >
                <Video className="w-3.5 h-3.5 mr-1" /> View Video
              </Button>
            )}

            {data?.status === 'running' && onOpenVnc && (
              <Button size="sm" variant="outline" className="text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20" onClick={onOpenVnc}>
                <Monitor className="w-3.5 h-3.5 mr-1 text-sky-400" /> View Live VNC
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-border px-6 gap-2 bg-muted/10 text-xs font-medium">
          <button
            onClick={() => setTab('steps')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              tab === 'steps' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" /> Execution Trace ({resultsList.length})
          </button>

          {recording && (
            <button
              onClick={() => setTab('video')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                tab === 'video' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" /> Screen Recording
            </button>
          )}

          <button
            onClick={() => setTab('variables')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              tab === 'variables' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Variables ({Object.keys(variablesMap).length})
          </button>

          <button
            onClick={() => setTab('payload')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              tab === 'payload' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Request Payload
          </button>

          <button
            onClick={() => setTab('result')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              tab === 'result' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" /> Raw Response
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Loading request telemetry...
            </div>
          ) : !data ? (
            <div className="text-center text-muted-foreground py-12">No data available</div>
          ) : (
            <>
              {/* Execution Trace Tab */}
              {tab === 'steps' && (
                <div className="space-y-4">
                  {resultsList.length === 0 ? (
                    <div className="space-y-4">
                      <div className="text-center text-muted-foreground py-6 text-sm">
                        {data.status === 'running'
                          ? 'Execution currently in progress...'
                          : 'No step execution trace recorded for this request.'}
                      </div>
                      {Array.isArray(data.workflow) && data.workflow.length > 0 && (
                        <div className="border border-border rounded-lg p-4 bg-muted/10">
                          <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                            Configured Workflow Steps ({data.workflow.length})
                          </h4>
                          <div className="space-y-2">
                            {data.workflow.map((st: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs font-mono p-2 rounded bg-card/60 border border-border">
                                <span className="text-muted-foreground w-6 text-right">{idx + 1}.</span>
                                <Badge variant="outline" className="text-[11px]">{st.action || 'step'}</Badge>
                                <span className="text-foreground/90 truncate">{JSON.stringify(st)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resultsList.map((step: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-card/60"
                        >
                          <div className="mt-0.5">
                            {step.error ? (
                              <XCircle className="w-4 h-4 text-destructive" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                          <span className="font-mono text-xs text-muted-foreground w-6 pt-0.5">
                            #{step.index ?? idx + 1}
                          </span>
                          <span className="font-mono text-xs font-semibold text-primary pt-0.5">
                            {step.action}
                          </span>
                          <div className="flex-1 overflow-hidden">
                            {step.data?.screenshot ? (
                              <div className="mt-2">
                                <span className="text-muted-foreground text-[11px]">Screenshot captured:</span>
                                <img
                                  src={`data:image/png;base64,${step.data.screenshot}`}
                                  alt="Step Screenshot"
                                  className="mt-1 max-w-sm rounded border border-border shadow"
                                />
                              </div>
                            ) : step.data ? (
                              <pre className="font-mono text-[11px] text-foreground/80 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(step.data, null, 2)}
                              </pre>
                            ) : step.error ? (
                              <div className="text-destructive font-mono text-[11px] bg-destructive/10 p-2 rounded">
                                {step.error}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">Completed successfully</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Screen Recording Tab */}
              {tab === 'video' && recording && (
                <div className="space-y-4">
                  <VideoPlayer url={recording.url} filename={recording.filename} />
                </div>
              )}

              {/* Variables Tab */}
              {tab === 'variables' && (
                <div>
                  {Object.keys(variablesMap).length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      No runtime variables were saved in this workflow.
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 border-b border-border">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold text-muted-foreground">Variable Name</th>
                            <th className="py-2.5 px-4 font-semibold text-muted-foreground">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-mono">
                          {Object.entries(variablesMap).map(([k, v]) => (
                            <tr key={k} className="hover:bg-muted/20">
                              <td className="py-2.5 px-4 text-primary font-medium">{k}</td>
                              <td className="py-2.5 px-4 text-foreground/90 break-all">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Request Payload Tab */}
              {tab === 'payload' && (
                <div className="relative">
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 text-xs h-7"
                    onClick={() => copyJson(payloadObj)}
                  >
                    {copied ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <pre className="p-4 rounded-lg bg-black/60 border border-border text-xs font-mono text-emerald-300 overflow-x-auto">
                    {JSON.stringify(payloadObj, null, 2)}
                  </pre>
                </div>
              )}

              {/* Raw Result Tab */}
              {tab === 'result' && (
                <div className="relative">
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 text-xs h-7"
                    onClick={() => copyJson(rawResultObj)}
                  >
                    {copied ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <pre className="p-4 rounded-lg bg-black/60 border border-border text-xs font-mono text-blue-300 overflow-x-auto">
                    {JSON.stringify(rawResultObj, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
