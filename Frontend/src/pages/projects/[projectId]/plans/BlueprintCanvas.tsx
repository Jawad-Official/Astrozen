import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layout,
  Database,
  ArrowSquareOut,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  ArrowsOutSimple,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { BlueprintNode, BlueprintEdge } from './types';
import { GRID_SIZE, NODE_WIDTH, NODE_HEIGHT } from './constants';

export const BlueprintCanvas = ({
  nodes = [],
  edges = [],
  onNodeClick,
  onCanvasClick,
  onNodesChange,
  className
}: {
  nodes?: BlueprintNode[],
  edges?: BlueprintEdge[],
  onNodeClick?: (node: BlueprintNode) => void,
  onCanvasClick?: () => void,
  onNodesChange?: (nodes: BlueprintNode[]) => void,
  className?: string
}) => {  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isCanvasDragging = useRef(false);

  // Internal nodes state for dragging
  const [internalNodes, setInternalNodes] = useState<BlueprintNode[]>(nodes);

  // Sync props to state when props change
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  useEffect(() => {
    if (!draggingNodeId && nodes.length > 0) {
        setInternalNodes(nodes);
    }
  }, [nodes, draggingNodeId]);

  // Node Dragging References
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const nodeStartRef = useRef<{ x: number, y: number } | null>(null);
  const canvasStartRef = useRef<{ x: number, y: number } | null>(null);
  const canvasOriginRef = useRef<{ x: number, y: number } | null>(null);

  // Calculate connection point between two nodes
  const getConnectionPoints = (from: BlueprintNode, to: BlueprintNode) => {
    const fromCenterX = from.x + NODE_WIDTH / 2;
    const fromCenterY = from.y + NODE_HEIGHT / 2;
    const toCenterX = to.x + NODE_WIDTH / 2;
    const toCenterY = to.y + NODE_HEIGHT / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    let x1, y1, x2, y2;

    if (Math.abs(dx) > Math.abs(dy)) {
      x1 = dx > 0 ? from.x + NODE_WIDTH : from.x;
      y1 = fromCenterY;
      x2 = dx > 0 ? to.x : to.x + NODE_WIDTH;
      y2 = toCenterY;
    } else {
      x1 = fromCenterX;
      y1 = dy > 0 ? from.y + NODE_HEIGHT : from.y;
      x2 = toCenterX;
      y2 = dy > 0 ? to.y : to.y + NODE_HEIGHT;
    }

    return { x1, y1, x2, y2 };
  };

  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const node = internalNodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggingNodeId(nodeId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    nodeStartRef.current = { x: node.x, y: node.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    isCanvasDragging.current = true;
    canvasStartRef.current = { x: e.clientX, y: e.clientY };
    canvasOriginRef.current = { ...position };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      // Handle Node Drag
      if (draggingNodeId && dragStartRef.current && nodeStartRef.current) {
        const dx = (e.clientX - dragStartRef.current.x) / scale;
        const dy = (e.clientY - dragStartRef.current.y) / scale;

        const rawX = nodeStartRef.current.x + dx;
        const rawY = nodeStartRef.current.y + dy;

        // Grid Snapping
        const newX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
        const newY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

        setInternalNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n));
        return;
      }

      // Handle Canvas Pan
      if (isCanvasDragging.current && canvasStartRef.current && canvasOriginRef.current) {
        const dx = (e.clientX - canvasStartRef.current.x);
        const dy = (e.clientY - canvasStartRef.current.y);

        const adjustedDx = dx / scale;
        const adjustedDy = dy / scale;

        setPosition({
            x: canvasOriginRef.current.x + adjustedDx,
            y: canvasOriginRef.current.y + adjustedDy
        });
      }
    };

    const handleGlobalPointerUp = () => {
      if (draggingNodeId) {
        // Save only on pointer up to minimize backend calls
        setInternalNodes(current => {
            if (onNodesChange) onNodesChange(current);
            return current;
        });
        setDraggingNodeId(null);
      }

      if (isCanvasDragging.current) {
        isCanvasDragging.current = false;
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [draggingNodeId, scale, onNodesChange]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const newScale = Math.min(Math.max(0.2, scale - e.deltaY * 0.001), 3);
      setScale(newScale);
    }
  };

  const fitToView = useCallback(() => {
    if (internalNodes.length === 0 || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const minX = Math.min(...internalNodes.map(n => n.x));
    const maxX = Math.max(...internalNodes.map(n => n.x + NODE_WIDTH));
    const minY = Math.min(...internalNodes.map(n => n.y));
    const maxY = Math.max(...internalNodes.map(n => n.y + NODE_HEIGHT));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const padding = 60;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const newScale = Math.min(Math.max(0.2, Math.min(scaleX, scaleY)), 1.2);

    setScale(newScale);

    const centeredX = (containerWidth / newScale - contentWidth) / 2 - minX;
    const centeredY = (containerHeight / newScale - contentHeight) / 2 - minY;

    setPosition({ x: centeredX, y: centeredY });
  }, [internalNodes]);

  const [hasFitted, setHasFitted] = useState(false);
  useEffect(() => {
    if (internalNodes.length > 0 && !hasFitted) {
      fitToView();
      setHasFitted(true);
    }
  }, [internalNodes, hasFitted, fitToView]);

  useEffect(() => {
    if (internalNodes.length === 0 && hasFitted) {
      setHasFitted(false);
    }
  }, [internalNodes.length, hasFitted]);

  if (!internalNodes || internalNodes.length === 0) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center h-[500px] text-white/20 bg-black/40 rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors", className)}
        onClick={onCanvasClick}
      >
        <Layout size={48} weight="thin" />
        <p className="mt-4 text-sm font-bold uppercase tracking-widest">No blueprint generated</p>
        <p className="text-[10px] mt-2 text-white/10 italic">Click to open full view</p>
      </div>
    );
  }

  return (
    <div
      className={cn("relative w-full h-full bg-card overflow-hidden rounded-xl border border-border group cursor-grab active:cursor-grabbing shadow-inner", className)}
      ref={containerRef}
      onWheel={handleWheel}
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`,
        backgroundPosition: `${position.x * scale}px ${position.y * scale}px`
      }}
    >
      {/* Controls */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-50 flex flex-row sm:flex-col gap-2 bg-black/80 backdrop-blur-md p-2 rounded-lg border border-white/10 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
          <MagnifyingGlassPlus size={18} className="sm:hidden" />
          <MagnifyingGlassPlus size={16} className="hidden sm:block" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={fitToView}>
          <ArrowsOutSimple size={18} className="sm:hidden" />
          <ArrowsOutSimple size={16} className="hidden sm:block" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setScale(s => Math.max(0.2, s - 0.2))}>
          <MagnifyingGlassMinus size={18} className="sm:hidden" />
          <MagnifyingGlassMinus size={16} className="hidden sm:block" />
        </Button>
      </div>

      {/* Canvas Layer with pan/zoom */}
      <motion.div
        className="w-full h-full origin-top-left will-change-transform"
        onPointerDown={handleCanvasPointerDown}
        onClick={() => {
            if (!isCanvasDragging.current && !draggingNodeId && onCanvasClick) {
                onCanvasClick();
            }
        }}
        style={{
            scale,
            transform: `translate3d(0,0,0)` // Force GPU layer
        }}
      >
        <div
            className="relative w-[10000px] h-[10000px]"
            style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`
            }}
        >
           {/* Edges - SVG layer */}
           <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
            {edges.map((edge, i) => {
              const fromNode = internalNodes.find(n => n.id === edge.from);
              const toNode = internalNodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const { x1, y1, x2, y2 } = getConnectionPoints(fromNode, toNode);

              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#4a5568"
                    strokeWidth="2"
                    className="opacity-40"
                  />
                  <circle cx={x2} cy={y2} r="4" fill="#4a5568" className="opacity-60" />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {internalNodes.map((node) => (
            <div
              key={node.id}
              className={cn(
                  "absolute w-[240px] bg-background/90 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden hover:border-primary/30 hover:shadow-primary/5 will-change-transform",
                  draggingNodeId === node.id ? "z-[100] border-primary/50 shadow-2xl scale-[1.02] cursor-grabbing" : "z-10 cursor-grab transition-all duration-200"
              )}
              style={{
                transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                top: 0,
                left: 0,
                touchAction: 'none'
              }}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (!isCanvasDragging.current && !draggingNodeId) {
                    onNodeClick?.(node);
                }
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/5 bg-white/[0.02] pointer-events-none select-none">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center bg-gradient-to-br",
                      node.type === 'entry' ? "from-purple-500/20 to-purple-500/5 text-purple-400" :
                      node.type === 'action' ? "from-blue-500/20 to-blue-500/5 text-blue-400" :
                      node.type === 'service' ? "from-cyan-500/20 to-cyan-500/5 text-cyan-400" :
                      node.type === 'database' ? "from-amber-500/20 to-amber-500/5 text-amber-400" :
                      node.type === 'external' ? "from-pink-500/20 to-pink-500/5 text-pink-400" :
                      "from-emerald-500/20 to-emerald-500/5 text-emerald-400"
                    )}>
                      {node.type === 'database' ? <Database size={14} weight="duotone" /> :
                       node.type === 'external' ? <ArrowSquareOut size={14} weight="duotone" /> :
                       <Layout size={14} weight="duotone" />}
                    </div>
                    <span className="text-xs font-bold text-white/90">{node.label}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-white/30">
                    <span>Completion</span>
                    <span>{node.completion || 0}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        (node.completion || 0) === 100 ? "bg-emerald-500" :
                        node.type === 'database' ? "bg-amber-500" :
                        node.type === 'service' ? "bg-cyan-500" :
                        "bg-primary"
                      )}
                      style={{ width: `${node.completion || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Subtasks */}
              {node.subtasks && node.subtasks.length > 0 && (
                <div className="p-3 space-y-2 bg-black/20 pointer-events-none select-none">
                  {node.subtasks.slice(0, 4).map((task, i) => (
                    <div key={i} className="flex items-center gap-2.5 group">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                        i === 0 ? "bg-emerald-500 group-hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                        i === 1 ? "bg-blue-500 group-hover:bg-blue-400" :
                        "bg-white/20 group-hover:bg-white/40"
                      )} />
                      <span className="text-[10px] text-white/60 truncate group-hover:text-white/90 transition-colors">{task}</span>
                    </div>
                  ))}
                  {node.subtasks.length > 4 && (
                    <div className="text-[9px] font-bold text-white/20 pl-4 pt-1 uppercase tracking-widest">
                      +{node.subtasks.length - 4} more tasks
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
