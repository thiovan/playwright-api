import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Play,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Code2,
  RefreshCw,
  Plus,
  Network,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useToast, useConfirm } from '../context/NotificationContext';
import type { WorkflowTemplate } from '../types';

interface TemplatesPageProps {
  onLoadTemplateToBuilder: (template: WorkflowTemplate) => void;
  onNavigate: (tab: string) => void;
}

export function TemplatesPage({ onLoadTemplateToBuilder, onNavigate }: TemplatesPageProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const list = await api.getTemplates();
      setTemplates(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const copyWorkflowJson = (tpl: WorkflowTemplate) => {
    const payload = {
      config: { headless: true, viewport: { width: 1280, height: 720 } },
      workflow: tpl.workflow,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(tpl.id);
    toast.success('Template JSON copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to permanently delete this template from Redis?',
      confirmText: 'Delete Template',
      variant: 'destructive',
    });
    if (!ok) return;

    try {
      await api.deleteTemplate(id);
      loadTemplates();
      toast.success('Template deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflow Template Library</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pre-built recipes and reusable Playwright automation pipelines stored in Redis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadTemplates} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => onNavigate('builder')}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create New in Builder
          </Button>
        </div>
      </div>

      {/* Grid of Templates */}
      {templates.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold">No Templates Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Build your first workflow in the canvas and click "Save as Template".
          </p>
          <Button size="sm" className="mt-4" onClick={() => onNavigate('builder')}>
            Go to Workflow Builder
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm group"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {tpl.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDelete(tpl.id, e)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Template"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                <CardTitle className="text-base text-foreground group-hover:text-primary transition-colors">
                  {tpl.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                  {tpl.description || 'No description provided.'}
                </p>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <div className="p-2.5 rounded-lg bg-black/40 border border-border/60 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                  <span>Steps Count:</span>
                  <span className="font-semibold text-foreground">{tpl.workflow?.length || 0} actions</span>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0 border-t border-border/60 bg-muted/10 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs flex-1"
                  onClick={() => copyWorkflowJson(tpl)}
                >
                  {copiedId === tpl.id ? (
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1" />
                  )}
                  {copiedId === tpl.id ? 'Copied' : 'Copy JSON'}
                </Button>

                <Button
                  size="sm"
                  className="h-8 text-xs flex-1"
                  onClick={() => onLoadTemplateToBuilder(tpl)}
                >
                  <Network className="w-3.5 h-3.5 mr-1" /> Open in Builder
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

