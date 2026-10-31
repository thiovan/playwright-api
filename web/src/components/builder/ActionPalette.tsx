import React from 'react';
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
  Plus,
} from 'lucide-react';

interface ActionItem {
  action: string;
  label: string;
  icon: React.ElementType;
  defaultData: Record<string, any>;
}

const ACTION_GROUPS: { group: string; items: ActionItem[] }[] = [
  {
    group: 'Navigation',
    items: [
      { action: 'goto', label: 'Go to URL', icon: Globe, defaultData: { action: 'goto', value: 'https://' } },
      { action: 'wait', label: 'Wait (ms)', icon: Clock, defaultData: { action: 'wait', value: 1000 } },
      { action: 'wait-for', label: 'Wait for Selector', icon: Clock, defaultData: { action: 'wait-for', selector: 'div' } },
      { action: 'close', label: 'Close Page', icon: Globe, defaultData: { action: 'close' } },
    ],
  },
  {
    group: 'Interactions',
    items: [
      { action: 'click', label: 'Click Element', icon: MousePointer, defaultData: { action: 'click', selector: 'button' } },
      { action: 'dblclick', label: 'Double Click', icon: MousePointer, defaultData: { action: 'dblclick', selector: 'button' } },
      { action: 'type', label: 'Type Input', icon: Keyboard, defaultData: { action: 'type', selector: 'input', value: '' } },
      { action: 'press', label: 'Press Key', icon: Keyboard, defaultData: { action: 'press', value: 'Enter' } },
      { action: 'select', label: 'Select Option', icon: CheckSquare, defaultData: { action: 'select', selector: 'select', value: '' } },
      { action: 'check', label: 'Check Checkbox', icon: CheckSquare, defaultData: { action: 'check', selector: 'input[type="checkbox"]' } },
      { action: 'hover', label: 'Hover Element', icon: MousePointer, defaultData: { action: 'hover', selector: 'div' } },
      { action: 'upload', label: 'Upload File', icon: Upload, defaultData: { action: 'upload', selector: 'input[type="file"]', value: '' } },
    ],
  },
  {
    group: 'Data & Extraction',
    items: [
      { action: 'screenshot', label: 'Screenshot', icon: Camera, defaultData: { action: 'screenshot' } },
      { action: 'eval', label: 'Evaluate JS', icon: Code2, defaultData: { action: 'eval', value: 'return document.title;' } },
      { action: 'get-text', label: 'Get Element Text', icon: Code2, defaultData: { action: 'get-text', selector: 'h1', name: 'extractedText' } },
      { action: 'get-attribute', label: 'Get Element Attribute', icon: Code2, defaultData: { action: 'get-attribute', selector: 'a', value: 'href', name: 'extractedLink' } },
      { action: 'cookie-get', label: 'Get Cookie', icon: Cookie, defaultData: { action: 'cookie-get', name: 'session' } },
      { action: 'cookie-set', label: 'Set Cookie', icon: Cookie, defaultData: { action: 'cookie-set', name: 'session_id', value: '123' } },
    ],
  },
  {
    group: 'Control & State',
    items: [
      { action: 'var-set', label: 'Set Variable', icon: Database, defaultData: { action: 'var-set', name: 'myVar', value: 'value' } },
      { action: 'var-get', label: 'Get Variable', icon: Database, defaultData: { action: 'var-get', name: 'myVar' } },
      { action: 'loop', label: 'Loop (Count/Cond)', icon: Repeat, defaultData: { action: 'loop', count: 3, workflow: [] } },
      { action: 'loop-elements', label: 'Loop Elements', icon: Repeat, defaultData: { action: 'loop-elements', selector: '.item', max: 5, workflow: [] } },
      { action: 'if', label: 'If Condition', icon: Split, defaultData: { action: 'if', condition: 'selector-exists', selector: '.banner', workflow: [] } },
    ],
  },
];

interface ActionPaletteProps {
  onAddNode: (actionData: any) => void;
}

export function ActionPalette({ onAddNode }: ActionPaletteProps) {
  return (
    <div className="w-64 border-r border-border bg-card/60 flex flex-col h-full overflow-y-auto p-4 select-none">
      <div className="mb-4">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Action Palette</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Click to add step to canvas</p>
      </div>

      <div className="space-y-5">
        {ACTION_GROUPS.map(group => (
          <div key={group.group}>
            <div className="text-[11px] font-semibold text-muted-foreground/80 mb-2 uppercase tracking-wider">
              {group.group}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.action}
                    onClick={() => onAddNode(item.defaultData)}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted border border-border/50 text-left text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium text-foreground/90">{item.label}</span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

