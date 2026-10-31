import type { Node, Edge } from '@xyflow/react';

/**
 * Converts React Flow nodes & edges into sequential Playwright workflow steps,
 * supporting hierarchical branching (True / False handles on 'if' nodes,
 * and Body / Done handles on 'loop' and 'loop-elements' nodes).
 */
export function graphToWorkflow(nodes: Node[], edges: Edge[]): any[] {
  if (!nodes || nodes.length === 0) return [];

  const nodeMap = new Map<string, Node>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const outgoing = new Map<string, Edge[]>();
  const incoming = new Map<string, Edge[]>();
  nodes.forEach(n => {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  });

  edges.forEach(e => {
    if (outgoing.has(e.source)) outgoing.get(e.source)!.push(e);
    if (incoming.has(e.target)) incoming.get(e.target)!.push(e);
  });

  // Helper to discover all downstream reachable nodes from a starting node
  function getReachable(startId: string, stopId: string | null = null): Set<string> {
    const visited = new Set<string>();
    const queue = [startId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (!cur || visited.has(cur) || cur === stopId) continue;
      visited.add(cur);
      const out = outgoing.get(cur) || [];
      for (const e of out) {
        if (!visited.has(e.target) && e.target !== stopId) {
          queue.push(e.target);
        }
      }
    }
    return visited;
  }

  // Find lowest common successor node where branches converge
  function findMergeNode(start1: string | null, start2: string | null): string | null {
    if (!start1 || !start2) return null;
    const r1 = getReachable(start1);
    const r2 = getReachable(start2);
    for (const id of r1) {
      if (r2.has(id)) return id;
    }
    return null;
  }

  function serializeChain(startId: string | null, stopId: string | null = null, visited = new Set<string>()): any[] {
    const chain: any[] = [];
    let curId: string | null = startId;

    while (curId && curId !== stopId && !visited.has(curId)) {
      visited.add(curId);
      const node = nodeMap.get(curId);
      if (!node) break;

      const data: Record<string, any> = { ...node.data };
      delete data.label;

      // Parse JSON string fallback if user edited in drawer
      if (typeof data.workflow === 'string') {
        try { data.workflow = JSON.parse(data.workflow); } catch {}
      }
      if (typeof data.else === 'string') {
        try { data.else = JSON.parse(data.else); } catch {}
      }

      const outEdges = outgoing.get(curId) || [];

      // Branching for IF condition
      if (data.action === 'if') {
        const trueEdge = outEdges.find(e => e.sourceHandle === 'true') || outEdges[0];
        const falseEdge = outEdges.find(e => e.sourceHandle === 'false');

        const mergeNode = findMergeNode(
          trueEdge ? trueEdge.target : null,
          falseEdge ? falseEdge.target : null
        );

        if (trueEdge) {
          const thenSteps = serializeChain(trueEdge.target, mergeNode || stopId, visited);
          if (thenSteps.length > 0) {
            data.workflow = thenSteps;
          }
        }
        if (falseEdge && falseEdge.target !== mergeNode) {
          const elseSteps = serializeChain(falseEdge.target, mergeNode || stopId, visited);
          if (elseSteps.length > 0) {
            data.else = elseSteps;
          }
        }

        chain.push(data);
        curId = mergeNode || (falseEdge ? falseEdge.target : null);
        continue;
      }

      // Branching for LOOP and LOOP-ELEMENTS
      if (data.action === 'loop' || data.action === 'loop-elements') {
        const bodyEdge = outEdges.find(e => e.sourceHandle === 'body');
        const doneEdge = outEdges.find(e => e.sourceHandle === 'done');

        const mergeNode = findMergeNode(
          bodyEdge ? bodyEdge.target : null,
          doneEdge ? doneEdge.target : null
        );
        const stopForBody = doneEdge ? doneEdge.target : mergeNode || stopId;

        if (bodyEdge) {
          const bodySteps = serializeChain(bodyEdge.target, stopForBody, visited);
          if (bodySteps.length > 0) {
            data.workflow = bodySteps;
          }
        }

        chain.push(data);
        curId = doneEdge ? doneEdge.target : mergeNode;
        continue;
      }

      chain.push(data);
      curId = outEdges.length > 0 ? outEdges[0].target : null;
    }

    return chain;
  }

  // Find root node (0 incoming edges)
  const root = nodes.find(n => (incoming.get(n.id) || []).length === 0) || nodes[0];
  const visitedGlobal = new Set<string>();
  const result = serializeChain(root ? root.id : null, null, visitedGlobal);

  // If there are unlinked nodes on canvas, append them by vertical position
  const unlinked = nodes.filter(n => !visitedGlobal.has(n.id));
  unlinked.sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));
  unlinked.forEach(n => {
    const d = { ...n.data };
    delete d.label;
    if (typeof d.workflow === 'string') {
      try { d.workflow = JSON.parse(d.workflow); } catch {}
    }
    if (typeof d.else === 'string') {
      try { d.else = JSON.parse(d.else); } catch {}
    }
    result.push(d);
  });

  return result;
}

/**
 * Converts a Playwright workflow step array into React Flow nodes and vertical connecting edges,
 * automatically creating visual True/False branching for 'if' steps,
 * and Body/Done branching for 'loop' / 'loop-elements' steps.
 */
export function workflowToGraph(workflow: any[]): { nodes: Node[]; edges: Edge[] } {
  if (!workflow || !Array.isArray(workflow) || workflow.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeIdCounter = 1;

  function processSteps(
    steps: any[],
    startX: number,
    startY: number,
    incomingSourceId: string | null,
    incomingHandle: string | null = null
  ): { maxY: number; leaves: Array<{ id: string; handle: string | null }> } {
    let curY = startY;
    let prevLeaves = incomingSourceId ? [{ id: incomingSourceId, handle: incomingHandle }] : [];

    steps.forEach((step) => {
      const id = `node_${nodeIdCounter++}`;
      const isIf = step.action === 'if';
      const isLoop = step.action === 'loop' || step.action === 'loop-elements';

      nodes.push({
        id,
        type: 'actionNode',
        position: { x: startX, y: curY },
        data: { ...step },
      });

      // Connect all preceding leaf nodes to this step
      prevLeaves.forEach((prev) => {
        const isTrue = prev.handle === 'true';
        const isFalse = prev.handle === 'false';
        const isBody = prev.handle === 'body';
        const isDone = prev.handle === 'done';

        const stroke = isTrue
          ? '#10b981'
          : isFalse
          ? '#f59e0b'
          : isBody
          ? '#06b6d4'
          : isDone
          ? '#a855f7'
          : 'hsl(var(--primary))';

        const label = isTrue
          ? 'True (then)'
          : isFalse
          ? 'False (else)'
          : isBody
          ? 'Loop Body'
          : isDone
          ? 'When Done'
          : undefined;

        const strokeColor = isTrue
          ? '#059669'
          : isFalse
          ? '#d97706'
          : isBody
          ? '#0891b2'
          : isDone
          ? '#9333ea'
          : '#334155';

        edges.push({
          id: `e_${prev.id}_${id}${prev.handle ? `_${prev.handle}` : ''}`,
          source: prev.id,
          target: id,
          sourceHandle: prev.handle || undefined,
          animated: true,
          label,
          labelStyle: {
            fill: stroke,
            fontSize: 10,
            fontWeight: 600,
          },
          labelBgPadding: [6, 2],
          labelBgBorderRadius: 4,
          labelBgStyle: {
            fill: '#090d16',
            fillOpacity: 0.9,
            stroke: strokeColor,
          },
          style: {
            stroke,
            strokeWidth: 2,
          },
        });
      });
      prevLeaves = [];

      if (isIf) {
        const hasThen = Array.isArray(step.workflow) && step.workflow.length > 0;
        const hasElse = Array.isArray(step.else) && step.else.length > 0;

        let branchMaxY = curY;
        const branchLeaves: Array<{ id: string; handle: string | null }> = [];

        if (hasThen) {
          const thenRes = processSteps(step.workflow, startX - 160, curY + 130, id, 'true');
          branchMaxY = Math.max(branchMaxY, thenRes.maxY);
          branchLeaves.push(...thenRes.leaves);
        }
        if (hasElse) {
          const elseRes = processSteps(step.else, startX + 160, curY + 130, id, 'false');
          branchMaxY = Math.max(branchMaxY, elseRes.maxY);
          branchLeaves.push(...elseRes.leaves);
        } else {
          // If no else branch, connect the FALSE handle directly to the next step
          branchLeaves.push({ id, handle: 'false' });
        }

        if (branchLeaves.length > 0) {
          curY = branchMaxY + 130;
          prevLeaves = branchLeaves;
        } else {
          curY += 130;
          prevLeaves = [{ id, handle: null }];
        }
      } else if (isLoop) {
        const hasBody = Array.isArray(step.workflow) && step.workflow.length > 0;

        if (hasBody) {
          const bodyRes = processSteps(step.workflow, startX - 160, curY + 130, id, 'body');
          curY = Math.max(curY + 130, bodyRes.maxY + 130);
          prevLeaves = [
            { id, handle: 'done' },
            ...bodyRes.leaves.map(l => ({ id: l.id, handle: null })),
          ];
        } else {
          curY += 130;
          prevLeaves = [{ id, handle: 'done' }];
        }
      } else {
        curY += 120;
        prevLeaves = [{ id, handle: null }];
      }
    });

    return { maxY: curY, leaves: prevLeaves };
  }

  processSteps(workflow, 250, 80, null);
  return { nodes, edges };
}
