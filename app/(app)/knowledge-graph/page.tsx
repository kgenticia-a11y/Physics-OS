"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Network,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import {
  type ConceptNode,
  type ConceptEdge,
  type MasteryOverlay,
  getMasteryLevel,
  MASTERY_COLORS,
} from "@/lib/physics/knowledge-graph";
import type { PrerequisiteGap, StudyRecommendation } from "@/lib/physics/prerequisite-detection";

interface GraphData {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  mastery: MasteryOverlay[];
  gaps: PrerequisiteGap[];
  recommendations: StudyRecommendation[];
}

interface LayoutNode extends ConceptNode {
  x: number;
  y: number;
}

const NODE_HIT_RADIUS = 24;

const TOPIC_COLORS: Record<string, string> = {
  kinematics: "#3b82f6",
  "newtons-laws": "#22c55e",
  "work-energy": "#f59e0b",
  momentum: "#ef4444",
  "rotational-motion": "#8b5cf6",
};

function layoutNodes(nodes: ConceptNode[], edges: ConceptEdge[]): LayoutNode[] {
  // Topological layer assignment
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  }
  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    adjList.get(edge.from)?.push(edge.to);
  }

  // BFS to assign layers
  const layers = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      layers.set(id, 0);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layers.get(current)!;
    for (const next of adjList.get(current) ?? []) {
      const newLayer = currentLayer + 1;
      if (!layers.has(next) || layers.get(next)! < newLayer) {
        layers.set(next, newLayer);
      }
      const remaining = inDegree.get(next)! - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) {
        queue.push(next);
      }
    }
  }

  // Group by layer
  const layerGroups = new Map<number, string[]>();
  for (const [id, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(id);
  }

  const maxLayer = Math.max(...layerGroups.keys());
  const canvasWidth = 1200;
  const canvasHeight = 800;
  const paddingX = 100;
  const paddingY = 80;

  const layoutResult: LayoutNode[] = [];

  for (const [layer, ids] of layerGroups) {
    const y = paddingY + (layer / Math.max(maxLayer, 1)) * (canvasHeight - paddingY * 2);
    const spacing = (canvasWidth - paddingX * 2) / (ids.length + 1);

    ids.forEach((id, index) => {
      const node = nodes.find((n) => n.id === id)!;
      layoutResult.push({
        ...node,
        x: paddingX + spacing * (index + 1),
        y,
      });
    });
  }

  return layoutResult;
}

export default function KnowledgeGraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutNodes_, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/knowledge-graph")
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? "Please log in to view your knowledge graph." : "Failed to load knowledge graph.");
        return res.json();
      })
      .then((d: GraphData) => {
        setData(d);
        setLayoutNodes(layoutNodes(d.nodes, d.edges));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong."))
      .finally(() => setLoading(false));
  }, []);

  const masteryMap = useMemo(() => {
    const map = new Map<string, MasteryOverlay>();
    for (const m of data?.mastery ?? []) {
      map.set(m.nodeId, m);
    }
    return map;
  }, [data]);

  const getMastery = useCallback(
    (nodeId: string) => masteryMap.get(nodeId),
    [masteryMap]
  );

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || layoutNodes_.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    for (const edge of data.edges) {
      const fromNode = layoutNodes_.find((n) => n.id === edge.from);
      const toNode = layoutNodes_.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) continue;

      const isHighlighted =
        selectedNode === edge.from ||
        selectedNode === edge.to ||
        hoveredNode === edge.from ||
        hoveredNode === edge.to;

      // Check if this edge represents a gap
      const isGap = data.gaps.some(
        (g) => g.weakNode === edge.from && g.affectedNode === edge.to
      );

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);

      // Curved edges
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      const dx = toNode.x - fromNode.x;
      const cpOffset = Math.abs(dx) > 100 ? 20 : 0;
      ctx.quadraticCurveTo(midX + cpOffset, midY - 20, toNode.x, toNode.y);

      ctx.strokeStyle = isGap
        ? "rgba(239, 68, 68, 0.7)"
        : isHighlighted
        ? "rgba(99, 102, 241, 0.8)"
        : "rgba(100, 116, 139, 0.2)";
      ctx.lineWidth = isGap ? 2.5 : isHighlighted ? 2 : 1;

      if (isGap) {
        ctx.setLineDash([6, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow head — tangent at endpoint is direction from control point to endpoint
      const cpX = midX + cpOffset;
      const cpY = midY - 20;
      const angle = Math.atan2(toNode.y - cpY, toNode.x - cpX);
      const arrowLen = 8;
      const arrowX = toNode.x - Math.cos(angle) * (NODE_HIT_RADIUS - 2);
      const arrowY = toNode.y - Math.sin(angle) * (NODE_HIT_RADIUS - 2);

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowLen * Math.cos(angle - Math.PI / 6),
        arrowY - arrowLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowX - arrowLen * Math.cos(angle + Math.PI / 6),
        arrowY - arrowLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = isGap
        ? "rgba(239, 68, 68, 0.7)"
        : isHighlighted
        ? "rgba(99, 102, 241, 0.8)"
        : "rgba(100, 116, 139, 0.3)";
      ctx.fill();
    }

    // Draw nodes
    for (const node of layoutNodes_) {
      const mastery = getMastery(node.id);
      const level = getMasteryLevel(mastery?.mastery ?? 0, mastery?.attempts ?? 0);
      const color = MASTERY_COLORS[level];
      const topicColor = TOPIC_COLORS[node.topic] ?? "#64748b";
      const isSelected = selectedNode === node.id;
      const isHovered = hoveredNode === node.id;
      const radius = isSelected ? NODE_HIT_RADIUS : isHovered ? NODE_HIT_RADIUS - 2 : NODE_HIT_RADIUS - 4;

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = `${topicColor}22`;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Border ring (topic color)
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? topicColor : `${topicColor}88`;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Mastery progress arc
      if (mastery && mastery.attempts > 0) {
        const angle = mastery.mastery * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 3, -Math.PI / 2, angle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.lineCap = "butt";
      }

      // Label
      ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isSelected || isHovered ? "#f8fafc" : "#94a3b8";
      const labelY = node.y + radius + 8;
      const words = node.name.split(" ");
      if (words.length <= 2) {
        ctx.fillText(node.name, node.x, labelY);
      } else {
        const mid = Math.ceil(words.length / 2);
        ctx.fillText(words.slice(0, mid).join(" "), node.x, labelY);
        ctx.fillText(words.slice(mid).join(" "), node.x, labelY + 13);
      }
    }

    ctx.restore();
  }, [data, layoutNodes_, selectedNode, hoveredNode, zoom, pan, getMastery]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const clicked = layoutNodes_.find((node) => {
      const dx = node.x - x;
      const dy = node.y - y;
      return dx * dx + dy * dy < NODE_HIT_RADIUS * NODE_HIT_RADIUS;
    });

    setSelectedNode(clicked ? clicked.id : null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const hovered = layoutNodes_.find((node) => {
      const dx = node.x - x;
      const dy = node.y - y;
      return dx * dx + dy * dy < NODE_HIT_RADIUS * NODE_HIT_RADIUS;
    });

    const newHovered = hovered ? hovered.id : null;
    setHoveredNode((prev) => {
      if (prev === newHovered) return prev;
      return newHovered;
    });
    canvas.style.cursor = hovered ? "pointer" : isPanning ? "grabbing" : "grab";
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const selectedNodeData = selectedNode
    ? data?.nodes.find((n) => n.id === selectedNode)
    : null;
  const selectedMastery = selectedNode ? getMastery(selectedNode) : null;

  if (error) {
    return (
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-red-500" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-muted-foreground mt-1">Loading concept map...</p>
        </div>
        <div className="h-[500px] rounded-xl border bg-card flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <Network className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Building your knowledge graph...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph</h1>
        <p className="text-muted-foreground mt-1">
          See how concepts connect — and where to focus next
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Canvas Area */}
        <div className="relative">
          <div
            ref={containerRef}
            className="rounded-xl border bg-slate-950/50 dark:bg-slate-950/80 overflow-hidden relative"
            style={{ height: 560 }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                setIsPanning(false);
                setHoveredNode(null);
              }}
            />

            {/* Zoom controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={resetView}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm rounded-lg p-3 text-xs border">
              <p className="font-medium mb-2 text-foreground">Mastery Level</p>
              <div className="space-y-1.5">
                {(["not-started", "weak", "developing", "strong", "mastered"] as const).map(
                  (level) => (
                    <div key={level} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: MASTERY_COLORS[level] }}
                      />
                      <span className="text-muted-foreground capitalize">
                        {level.replace("-", " ")}
                      </span>
                    </div>
                  )
                )}
              </div>
              <div className="mt-2 pt-2 border-t space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-red-500 border-dashed" style={{ borderTop: "2px dashed #ef4444" }} />
                  <span className="text-muted-foreground">Prerequisite gap</span>
                </div>
              </div>
            </div>
          </div>

          {/* Selected node detail */}
          {selectedNodeData && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedNodeData.name}</CardTitle>
                  {selectedMastery && selectedMastery.attempts > 0 ? (
                    <Badge
                      variant={
                        selectedMastery.mastery >= 0.7
                          ? "default"
                          : selectedMastery.mastery >= 0.4
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {Math.round(selectedMastery.mastery * 100)}% mastery
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not started</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedNodeData.description}
                </p>
                {selectedNodeData.prerequisites.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Prerequisites:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNodeData.prerequisites.map((p) => {
                        const prereqName =
                          data?.nodes.find((n) => n.id === p)?.name ?? p;
                        const prereqMastery = getMastery(p);
                        const level = getMasteryLevel(
                          prereqMastery?.mastery ?? 0,
                          prereqMastery?.attempts ?? 0
                        );
                        return (
                          <Badge
                            key={p}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-accent"
                            style={{ borderColor: MASTERY_COLORS[level] }}
                            onClick={() => setSelectedNode(p)}
                          >
                            {prereqName}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Link href={`/practice?topic=${selectedNodeData.topic}`}>
                  <Button size="sm" className="w-full">
                    Practice this concept
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Prerequisite Gaps */}
          {data && data.gaps.length > 0 && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Prerequisite Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.gaps.slice(0, 4).map((gap, i) => (
                    <div key={i} className="text-xs">
                      <button
                        className="font-medium text-red-600 dark:text-red-400 hover:underline text-left"
                        onClick={() => setSelectedNode(gap.weakNode)}
                      >
                        {gap.weakNodeName}
                      </button>
                      <p className="text-muted-foreground mt-0.5">
                        {gap.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {data && data.recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Recommended Next
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
                        {i + 1}
                      </div>
                      <div className="text-xs">
                        <button
                          className="font-medium hover:underline text-left"
                          onClick={() => setSelectedNode(rec.nodeId)}
                        >
                          {rec.nodeName}
                        </button>
                        <p className="text-muted-foreground mt-0.5">
                          {rec.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Topic legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(TOPIC_COLORS).map(([slug, color]) => (
                  <div key={slug} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border-2"
                      style={{ borderColor: color }}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {slug.replace(/-/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Empty state tip */}
          {data && data.gaps.length === 0 && data.recommendations.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center">
                <Network className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Start practicing to see personalized recommendations and
                  prerequisite detection.
                </p>
                <Link href="/practice" className="block mt-3">
                  <Button variant="outline" size="sm">
                    Start practicing
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
