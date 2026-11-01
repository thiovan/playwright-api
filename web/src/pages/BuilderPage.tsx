import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import {
  Play,
  Save,
  Download,
  Upload,
  Trash2,
  Sliders,
  Check,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import { CustomStepNode } from '../components/builder/CustomStepNode';
import { ActionPalette } from '../components/builder/ActionPalette';
import { StepConfigDrawer } from '../components/builder/StepConfigDrawer';
import { RunnerModal } from '../components/builder/RunnerModal';
import {
  WorkflowConfigModal,
  DEFAULT_WORKFLOW_CONFIG,
} from '../components/builder/WorkflowConfigModal';
import { graphToWorkflow, workflowToGraph } from '../components/builder/serializer';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../components/ui/Dialog';
import { api } from '../lib/api';
import { useToast, useConfirm } from '../context/NotificationContext';
import type { WorkflowTemplate, WorkflowConfig } from '../types';

const nodeTypes = {
  actionNode: CustomStepNode,
};

const INITIAL_WORKFLOW = [
  { action: 'goto', value: 'https://example.com' },
  { action: 'wait-for', selector: 'h1' },
  { action: 'eval', value: 'return document.querySelector("h1").innerText;' },
  { action: 'screenshot' },
];

interface BuilderPageProps {
  onOpenVnc: () => void;
  activeTemplate: WorkflowTemplate | null;
  onClearActiveTemplate: () => void;
}

function BuilderCanvas({ onOpenVnc, activeTemplate, onClearActiveTemplate }: BuilderPageProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const initial = activeTemplate?.workflow
    ? workflowToGraph(activeTemplate.workflow)
    : workflowToGraph(INITIAL_WORKFLOW);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Workflow Runtime Configuration State
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>(
    activeTemplate?.config || DEFAULT_WORKFLOW_CONFIG
  );

  // Modals
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState(activeTemplate?.name || '');
  const [templateDesc, setTemplateDesc] = useState(activeTemplate?.description || '');
  const [templateTags, setTemplateTags] = useState(activeTemplate?.tags?.join(', ') || 'Custom, Automation');

  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTemplate) {
      setTemplateName(activeTemplate.name || '');
      setTemplateDesc(activeTemplate.description || '');
      setTemplateTags(activeTemplate.tags?.join(', ') || 'Custom, Automation');
      if (activeTemplate.config) {
        setWorkflowConfig(activeTemplate.config);
      }
    }
  }, [activeTemplate]);

  // Connect edges
  const onConnect = useCallback(
    (params: Connection) => {
      const isTrue = params.sourceHandle === 'true';
      const isFalse = params.sourceHandle === 'false';
      const isBody = params.sourceHandle === 'body';
      const isDone = params.sourceHandle === 'done';

      const strokeColor = isTrue
        ? '#10b981'
        : isFalse
        ? '#f59e0b'
        : isBody
        ? '#06b6d4'
        : isDone
        ? '#a855f7'
        : 'hsl(var(--primary))';

      const strokeBorder = isTrue
        ? '#059669'
        : isFalse
        ? '#d97706'
        : isBody
        ? '#0891b2'
        : isDone
        ? '#9333ea'
        : '#334155';

      const edgeLabel = isTrue
        ? 'True (then)'
        : isFalse
        ? 'False (else)'
        : isBody
        ? 'Loop Body'
        : isDone
        ? 'When Done'
        : undefined;

      return setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            label: edgeLabel,
            labelStyle: {
              fill: strokeColor,
              fontSize: 10,
              fontWeight: 600,
            },
            labelBgPadding: [6, 2],
            labelBgBorderRadius: 4,
            labelBgStyle: {
              fill: '#090d16',
              fillOpacity: 0.9,
              stroke: strokeBorder,
            },
            style: { stroke: strokeColor, strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Add node from palette
  const handleAddNode = useCallback(
    (actionData: Record<string, any>) => {
      setNodes((nds) => {
        const id = `node_${nds.length + 1}_${Math.random().toString(36).substring(2, 6)}`;
        const lastNode = nds[nds.length - 1];
        const newPos = lastNode
          ? { x: lastNode.position.x, y: lastNode.position.y + 110 }
          : { x: 250, y: 100 };

        const newNode: Node = {
          id,
          type: 'actionNode',
          position: newPos,
          data: { ...actionData },
        };

        // Automatically connect edge from previous node if available
        if (lastNode) {
          setEdges((eds) =>
            addEdge(
              {
                id: `e_${lastNode.id}-${id}`,
                source: lastNode.id,
                target: id,
                animated: true,
                style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
              },
              eds
            )
          );
        }

        return [...nds, newNode];
      });
    },
    [setNodes, setEdges]
  );

  // Select node
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Update node data from drawer
  const handleUpdateNodeData = useCallback(
    (id: string, newData: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: newData } : n))
      );
    },
    [setNodes]
  );

  // Delete node
  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges]
  );

  // Compiled workflow steps
  const compiledWorkflow = graphToWorkflow(nodes, edges);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Export JSON with current active config
  const handleExportJson = () => {
    const cleanConfig: any = {
      headless: workflowConfig.headless ?? true,
      viewport: workflowConfig.viewport || { width: 1280, height: 720 },
    };
    if (workflowConfig.recordVideo) cleanConfig.recordVideo = true;
    if (workflowConfig.noMedia) cleanConfig.noMedia = true;
    if (workflowConfig.debug === false) cleanConfig.debug = false;
    if (workflowConfig.humanize !== undefined) cleanConfig.humanize = workflowConfig.humanize;
    if (workflowConfig.showCursor !== undefined) cleanConfig.showCursor = workflowConfig.showCursor;
    if (workflowConfig.workflowTimeout !== undefined) cleanConfig.workflowTimeout = workflowConfig.workflowTimeout;
    if (workflowConfig.gpuVendor) cleanConfig.gpuVendor = workflowConfig.gpuVendor;
    if (workflowConfig.gpuRenderer) cleanConfig.gpuRenderer = workflowConfig.gpuRenderer;
    if (workflowConfig.userAgent) cleanConfig.userAgent = workflowConfig.userAgent;
    if (workflowConfig.proxy?.server) cleanConfig.proxy = workflowConfig.proxy;

    const payload = {
      config: cleanConfig,
      workflow: compiledWorkflow,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    toast.success('Workflow JSON copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Save template with config
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      await api.saveTemplate({
        id: activeTemplate?.id,
        name: templateName,
        description: templateDesc,
        tags: templateTags.split(',').map((t) => t.trim()).filter(Boolean),
        workflow: compiledWorkflow,
        config: workflowConfig,
        graph: { nodes, edges },
      });
      setSaveModalOpen(false);
      toast.success('Template saved to Redis library successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    }
  };

  // Import JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const wf = Array.isArray(parsed) ? parsed : parsed.workflow;
        if (!wf || !Array.isArray(wf)) {
          toast.error('Invalid JSON: Must contain a "workflow" array or be an array of steps.');
          return;
        }
        if (parsed.config && typeof parsed.config === 'object') {
          setWorkflowConfig(parsed.config);
          toast.info('Loaded workflow config from JSON');
        }
        const g = workflowToGraph(wf);
        setNodes(g.nodes);
        setEdges(g.edges);
        toast.success(`Workflow loaded with ${wf.length} actions`);
      } catch (err: any) {
        toast.error(`Failed to parse workflow JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClear = async () => {
    const ok = await confirm({
      title: 'Clear Canvas',
      message: 'Are you sure you want to clear all steps from canvas? This action cannot be undone.',
      confirmText: 'Clear Canvas',
      variant: 'destructive',
    });
    if (!ok) return;

    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setWorkflowConfig(DEFAULT_WORKFLOW_CONFIG);
    toast.info('Canvas cleared');
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Top Toolbar */}
      <div className="h-12 border-b border-border bg-card/70 backdrop-blur px-4 flex items-center justify-between shrink-0 select-none z-10">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setRunnerOpen(true)}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Run / Test
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setConfigModalOpen(true)}
            title="Configure browser & runtime parameters"
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5" /> Config
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setSaveModalOpen(true)}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save Template
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleExportJson}
          >
            {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Download className="w-3.5 h-3.5 mr-1" />}
            {copied ? 'Copied JSON' : 'Export JSON'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-1" /> Import JSON
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono bg-muted/60 px-2 py-0.5 rounded text-[11px]">
            {nodes.length} Actions
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleClear}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Action Palette */}
        <ActionPalette onAddNode={handleAddNode} />

        {/* Center React Flow Canvas */}
        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{ animated: true }}
            className="bg-dot-pattern"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(255,255,255,0.07)" />
            <Controls className="!bg-card !border-border !text-foreground !rounded-lg overflow-hidden" />
            <MiniMap
              nodeColor={() => 'hsl(var(--primary))'}
              maskColor="rgba(0, 0, 0, 0.7)"
              className="!bg-card/80 !border-border !rounded-lg overflow-hidden"
            />
          </ReactFlow>
        </div>

        {/* Right Node Property Drawer */}
        {selectedNode && (
          <StepConfigDrawer
            selectedNode={selectedNode}
            onUpdateNodeData={handleUpdateNodeData}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      {/* Interactive Execution Runner Modal */}
      <RunnerModal
        open={runnerOpen}
        onClose={() => setRunnerOpen(false)}
        workflow={compiledWorkflow}
        onOpenVnc={onOpenVnc}
        initialConfig={workflowConfig}
      />

      {/* Global Workflow Runtime Config Modal */}
      <WorkflowConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        config={workflowConfig}
        onSave={(newCfg) => {
          setWorkflowConfig(newCfg);
          toast.success('Workflow configuration saved');
        }}
      />

      {/* Save Template Modal */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogClose onClose={() => setSaveModalOpen(false)} />
        <DialogHeader>
          <DialogTitle>Save Workflow Template</DialogTitle>
          <DialogDescription>
            Store this visual pipeline in the Redis template library for quick reuse or scheduling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Template Name</label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Amazon Price Tracker"
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
            <Input
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
              placeholder="e.g. Enters search keyword, filters by price, extracts first 5 items"
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Tags (Comma-separated)</label>
            <Input
              value={templateTags}
              onChange={(e) => setTemplateTags(e.target.value)}
              placeholder="Scraping, E-commerce, Daily"
              className="mt-1 text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setSaveModalOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveTemplate} disabled={!templateName.trim()}>
            Save Template
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export function BuilderPage(props: BuilderPageProps) {
  return (
    <ReactFlowProvider>
      <BuilderCanvas {...props} />
    </ReactFlowProvider>
  );
}
