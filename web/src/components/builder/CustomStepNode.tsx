import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Globe,
  MousePointer,
  Keyboard,
  Camera,
  Code2,
  Clock,
  CheckSquare,
  Upload,
  Repeat,
  Split,
  Database,
  Cookie,
  Sliders,
  Eye,
} from 'lucide-react';

export function getActionIcon(action: string) {
  switch (action) {
    case 'goto': return Globe;
    case 'click':
    case 'dblclick':
    case 'hover': return MousePointer;
    case 'type':
    case 'press':
    case 'keydown':
    case 'keyup': return Keyboard;
    case 'screenshot': return Camera;
    case 'eval': return Code2;
    case 'wait':
    case 'wait-for': return Clock;
    case 'select':
    case 'check':
    case 'uncheck': return CheckSquare;
    case 'upload': return Upload;
    case 'loop':
    case 'loop-elements': return Repeat;
    case 'if': return Split;
    case 'var-set':
    case 'var-get': return Database;
    case 'cookie-set':
    case 'cookie-get': return Cookie;
    default: return Sliders;
  }
}

export function getActionColor(action: string) {
  switch (action) {
    case 'goto': return 'border-sky-500/50 bg-sky-950/40 text-sky-400';
    case 'click':
    case 'dblclick':
    case 'type':
    case 'select': return 'border-indigo-500/50 bg-indigo-950/40 text-indigo-400';
    case 'screenshot': return 'border-emerald-500/50 bg-emerald-950/40 text-emerald-400';
    case 'eval': return 'border-amber-500/50 bg-amber-950/40 text-amber-400';
    case 'if':
    case 'loop':
    case 'loop-elements': return 'border-purple-500/50 bg-purple-950/40 text-purple-400';
    case 'var-set':
    case 'var-get': return 'border-cyan-500/50 bg-cyan-950/40 text-cyan-400';
    default: return 'border-slate-500/50 bg-slate-900/60 text-slate-300';
  }
}

export const CustomStepNode = memo(({ data, selected }: NodeProps) => {
  const action = (data?.action as string) || 'goto';
  const Icon = getActionIcon(action);
  const colorClass = getActionColor(action);

  let displaySubtitle: string | null = null;
  if (action === 'if') {
    displaySubtitle = `${data?.condition || 'selector-exists'}: ${data?.selector || data?.name || data?.value || ''}`;
  } else if (action === 'loop') {
    displaySubtitle = data?.count ? `${data.count} iterations` : `cond: ${data?.condition || ''}`;
  } else if (action === 'loop-elements') {
    displaySubtitle = `${data?.selector || ''} (max: ${data?.max || 10})`;
  } else if (action === 'get-attribute') {
    displaySubtitle = `${data?.selector || ''} -> @${data?.value || 'attr'} (${data?.name || 'var'})`;
  } else if (action === 'cookie-set') {
    displaySubtitle = `${data?.name || 'cookie'}=${data?.value || ''}`;
  } else if (action === 'cookie-get') {
    displaySubtitle = `cookie: ${data?.name || ''}`;
  } else if (data?.selector) {
    displaySubtitle = `${data.selector}`;
  } else if (data?.value) {
    displaySubtitle = typeof data.value === 'object' ? JSON.stringify(data.value) : String(data.value);
  } else if (data?.name) {
    displaySubtitle = `var: ${data.name}`;
  }

  return (
    <div
      className={`relative min-w-[200px] max-w-[280px] rounded-lg border px-3 py-2.5 shadow-lg backdrop-blur-md transition-all ${colorClass} ${
        selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'hover:border-primary/50'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />

      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-black/40">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs uppercase tracking-wider">{action}</div>
          {displaySubtitle && (
            <div className="text-[11px] opacity-80 truncate font-mono mt-0.5" title={displaySubtitle}>
              {displaySubtitle}
            </div>
          )}
        </div>
      </div>

      {action === 'if' ? (
        <div className="mt-2.5 pt-2 border-t border-purple-500/30 flex items-center justify-between text-[10px] font-mono font-bold tracking-wider px-1">
          <div className="relative flex items-center gap-1 text-emerald-400">
            <span>TRUE</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="true"
              style={{ left: '25%', bottom: '-8px' }}
              className="!w-3.5 !h-3.5 !bg-emerald-500 !border-2 !border-background hover:scale-125 transition-transform"
            />
          </div>
          <div className="relative flex items-center gap-1 text-amber-400">
            <span>FALSE</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              style={{ left: '75%', bottom: '-8px' }}
              className="!w-3.5 !h-3.5 !bg-amber-500 !border-2 !border-background hover:scale-125 transition-transform"
            />
          </div>
        </div>
      ) : action === 'loop' || action === 'loop-elements' ? (
        <div className="mt-2.5 pt-2 border-t border-cyan-500/30 flex items-center justify-between text-[10px] font-mono font-bold tracking-wider px-1">
          <div className="relative flex items-center gap-1 text-cyan-400">
            <span>BODY</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="body"
              style={{ left: '25%', bottom: '-8px' }}
              className="!w-3.5 !h-3.5 !bg-cyan-500 !border-2 !border-background hover:scale-125 transition-transform"
            />
          </div>
          <div className="relative flex items-center gap-1 text-purple-400">
            <span>DONE</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="done"
              style={{ left: '75%', bottom: '-8px' }}
              className="!w-3.5 !h-3.5 !bg-purple-500 !border-2 !border-background hover:scale-125 transition-transform"
            />
          </div>
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
        />
      )}
    </div>
  );
});

CustomStepNode.displayName = 'CustomStepNode';

