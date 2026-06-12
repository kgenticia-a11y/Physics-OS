"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, RefreshCw, Download } from "lucide-react";
import DOMPurify from "dompurify";

const QUICK_DIAGRAMS = [
  {
    label: "Free body diagram — block on inclined plane",
    concept: "Free body diagram of a block sitting on an inclined plane at angle theta. Show all forces: weight (mg) pointing down, normal force (N) perpendicular to surface, friction (f) along the surface opposing motion. Include the weight components mg*sin(theta) along the plane and mg*cos(theta) perpendicular to the plane as dashed projection lines.",
  },
  {
    label: "Projectile motion trajectory",
    concept: "Projectile motion diagram showing a ball launched at angle theta with initial velocity v0. Show the parabolic trajectory, the initial velocity vector decomposed into horizontal (v0*cos(theta)) and vertical (v0*sin(theta)) components, the maximum height H, the range R, and gravity g acting downward. Mark key points: launch, peak, and landing.",
  },
  {
    label: "Newton's Third Law — action/reaction",
    concept: "Newton's Third Law diagram showing two blocks A and B in contact on a flat surface. Block A pushes Block B with force F_AB (to the right), and Block B pushes back on Block A with force F_BA (to the left, equal magnitude). Show each block as a separate free body diagram side by side with all forces labeled: weight, normal, applied force, and contact forces.",
  },
  {
    label: "Conservation of energy — roller coaster",
    concept: "Conservation of energy diagram showing a roller coaster cart on a track with three positions: top of first hill (height h1, velocity ~0), bottom of valley (height 0, maximum velocity), and top of second hill (height h2 < h1). Show energy bar charts at each position with PE (potential energy in blue) and KE (kinetic energy in red) bars, where total energy stays constant.",
  },
  {
    label: "Elastic vs inelastic collision",
    concept: "Collision diagram showing two scenarios side by side. Top: elastic collision between ball A (mass m1, velocity v1) and ball B (mass m2, at rest) — show before and after states with velocity arrows, both balls separate after collision. Bottom: perfectly inelastic collision — same initial state but after collision the balls stick together and move with combined velocity. Label all velocities and masses.",
  },
  {
    label: "Circular motion — forces on a car on a banked curve",
    concept: "Circular motion diagram showing a car on a banked curve (cross-section view). Show the bank angle theta, the car as a rectangle on the banked surface, weight mg pointing down, normal force N perpendicular to the road surface, and the net centripetal force pointing toward the center of the curve. Decompose N into horizontal and vertical components with dashed lines.",
  },
  {
    label: "Atwood machine (pulley system)",
    concept: "Atwood machine diagram showing a single fixed pulley at the top with a massless inextensible string over it. Mass m1 hangs on the left side and mass m2 (heavier) hangs on the right side. Show tension T in the string on both sides, weight m1*g and m2*g on each mass, and arrows showing m1 accelerates up while m2 accelerates down with acceleration a.",
  },
  {
    label: "Work-energy theorem",
    concept: "Work-energy theorem diagram showing a block being pushed by a force F across a rough surface over a distance d. Show the initial velocity v_i on the left and final velocity v_f on the right. Below, show an energy bar chart: initial KE + Work done by F - Work done by friction = final KE. Use arrows and labels to connect the physical situation to the energy equation.",
  },
];

export default function DiagramsPage() {
  const [concept, setConcept] = useState("");
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateDiagram(customConcept?: string) {
    const target = customConcept ?? concept;
    if (!target.trim()) return;

    setLoading(true);
    setError(null);
    setSvg(null);

    try {
      const res = await fetch("/api/diagrams/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: target }),
      });

      if (!res.ok) throw new Error("Failed to generate diagram");

      const data = await res.json();
      setSvg(data.svg);
    } catch {
      setError("Failed to generate diagram. Try again or rephrase your request.");
    } finally {
      setLoading(false);
    }
  }

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "physics-diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Diagram Generator</h1>
        <p className="text-muted-foreground mt-1">
          Generate physics diagrams for any mechanics concept
        </p>
      </div>

      {/* Custom input */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Describe what you want to visualize
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g. Free body diagram of a block being pulled up an inclined plane with friction..."
              className="min-h-[60px] resize-none"
              rows={2}
            />
            <Button
              onClick={() => generateDiagram()}
              disabled={!concept.trim() || loading}
              className="self-end"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Generate"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick diagrams */}
      {!svg && !loading && (
        <div className="mb-8">
          <h2 className="text-sm font-medium mb-3">Quick diagrams — core mechanics</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUICK_DIAGRAMS.map((qd) => (
              <button
                key={qd.label}
                onClick={() => {
                  setConcept(qd.concept);
                  generateDiagram(qd.concept);
                }}
                className="text-left"
                disabled={loading}
              >
                <Card className="h-full transition-colors hover:bg-accent/50 cursor-pointer">
                  <CardContent className="py-4">
                    <CardDescription className="text-sm text-foreground">
                      {qd.label}
                    </CardDescription>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Generating diagram...</p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-6 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </CardContent>
        </Card>
      )}

      {/* SVG output */}
      {svg && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">Generated diagram</Badge>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadSvg}>
                <Download className="h-4 w-4 mr-1" />
                Download SVG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateDiagram()}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSvg(null);
                  setConcept("");
                }}
              >
                New diagram
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div
                className="w-full bg-white rounded-lg overflow-hidden border"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(svg, {
                    USE_PROFILES: { svg: true, svgFilters: true },
                    ADD_TAGS: ["svg", "path", "circle", "rect", "line", "polyline", "polygon", "text", "tspan", "g", "defs", "marker", "use", "ellipse"],
                    ADD_ATTR: ["viewBox", "xmlns", "fill", "stroke", "stroke-width", "d", "cx", "cy", "r", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "transform", "font-size", "font-family", "text-anchor", "dominant-baseline", "stroke-dasharray", "marker-end", "marker-start", "id", "points", "rx", "ry", "opacity", "stroke-linecap", "stroke-linejoin", "refX", "refY", "markerWidth", "markerHeight", "orient", "markerUnits"],
                  }),
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
