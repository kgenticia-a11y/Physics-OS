"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw } from "lucide-react";

const CANVAS_W = 740;
const CANVAS_H = 300;
const GROUND_Y = 220;

function sliderVal(v: number | readonly number[]): number {
  return typeof v === "number" ? v : v[0];
}

function getRadius(m: number) {
  return 15 + m * 5;
}

// Clamp position so objects stay on screen
function clampPos(p: number, r: number) {
  return Math.max(r + 4, Math.min(CANVAS_W - r - 4, p));
}

export function CollisionSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Params
  const [mass1, setMass1] = useState(2);
  const [mass2, setMass2] = useState(1);
  const [v1Init, setV1Init] = useState(5);
  const [v2Init, setV2Init] = useState(-3);
  const [elastic, setElastic] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [collided, setCollided] = useState(false);
  const [done, setDone] = useState(false);

  // Display
  const [dispV1, setDispV1] = useState(5);
  const [dispV2, setDispV2] = useState(-3);
  const [dispP1, setDispP1] = useState(150);
  const [dispP2, setDispP2] = useState(550);
  const [cursor, setCursor] = useState<"default" | "grab" | "grabbing">("default");

  // Physics refs
  const p1Ref = useRef(150);
  const p2Ref = useRef(550);
  const vel1Ref = useRef(5);
  const vel2Ref = useRef(-3);
  const collidedRef = useRef(false);
  const draggingRef = useRef<0 | 1 | 2>(0); // 0=none 1=obj1 2=obj2

  const paramsRef = useRef({ mass1: 2, mass2: 1, elastic: true, speed: 1 });
  useEffect(() => {
    paramsRef.current = { mass1, mass2, elastic, speed };
  }, [mass1, mass2, elastic, speed]);

  // ---------- Drawing ----------
  const drawScene = useCallback(
    (
      p1: number, p2: number,
      cv1: number, cv2: number,
      hasCollided: boolean
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { mass1: m1, mass2: m2 } = paramsRef.current;
      const r1 = getRadius(m1);
      const r2 = getRadius(m2);

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Ground
      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_W, GROUND_Y);
      ctx.stroke();

      // Hatching below ground
      ctx.strokeStyle = "rgba(156,163,175,0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 40, GROUND_Y);
        ctx.lineTo(i * 40 - 16, GROUND_Y + 16);
        ctx.stroke();
      }

      // Object 1 (blue)
      const g1 = ctx.createRadialGradient(p1 - r1 * 0.3, GROUND_Y - r1 - r1 * 0.3, 2, p1, GROUND_Y - r1, r1);
      g1.addColorStop(0, "#93c5fd");
      g1.addColorStop(1, "#2563eb");
      ctx.beginPath();
      ctx.arc(p1, GROUND_Y - r1, r1, 0, Math.PI * 2);
      ctx.fillStyle = g1;
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, Math.round(r1 * 0.55))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${m1}kg`, p1, GROUND_Y - r1 + 4);

      // Object 2 (red)
      const g2 = ctx.createRadialGradient(p2 - r2 * 0.3, GROUND_Y - r2 - r2 * 0.3, 2, p2, GROUND_Y - r2, r2);
      g2.addColorStop(0, "#fca5a5");
      g2.addColorStop(1, "#dc2626");
      ctx.beginPath();
      ctx.arc(p2, GROUND_Y - r2, r2, 0, Math.PI * 2);
      ctx.fillStyle = g2;
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, Math.round(r2 * 0.55))}px sans-serif`;
      ctx.fillText(`${m2}kg`, p2, GROUND_Y - r2 + 4);

      // Velocity arrows
      const drawArrow = (c2: CanvasRenderingContext2D, ox: number, r: number, vel: number, color: string) => {
        if (Math.abs(vel) < 0.05) return;
        const arrowLen = vel * 10;
        const topY = GROUND_Y - r * 2 - 12;
        c2.strokeStyle = color;
        c2.lineWidth = 2.5;
        c2.beginPath();
        c2.moveTo(ox, topY);
        c2.lineTo(ox + arrowLen, topY);
        c2.stroke();
        c2.fillStyle = color;
        c2.beginPath();
        const dir = vel > 0 ? 1 : -1;
        c2.moveTo(ox + arrowLen, topY);
        c2.lineTo(ox + arrowLen - dir * 9, topY - 5);
        c2.lineTo(ox + arrowLen - dir * 9, topY + 5);
        c2.closePath();
        c2.fill();
      };
      drawArrow(ctx, p1, r1, cv1, "#3b82f6");
      drawArrow(ctx, p2, r2, cv2, "#ef4444");

      // Speed labels
      ctx.fillStyle = "#6b7280";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`v₁ = ${cv1.toFixed(2)} m/s`, p1, GROUND_Y + 18);
      ctx.fillText(`v₂ = ${cv2.toFixed(2)} m/s`, p2, GROUND_Y + 18);

      if (hasCollided) {
        ctx.save();
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Collision!", CANVAS_W / 2, 28);
        ctx.restore();
      }

      // Drag hint
      ctx.fillStyle = "rgba(156,163,175,0.8)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Drag objects to reposition", 10, CANVAS_H - 10);
    },
    [] // reads from paramsRef
  );

  useEffect(() => {
    if (!running) {
      drawScene(p1Ref.current, p2Ref.current, vel1Ref.current, vel2Ref.current, collidedRef.current);
    }
  }, [drawScene, mass1, mass2, running]);

  // ---------- Animation loop ----------
  useEffect(() => {
    if (!running) return;
    let lastTs: number | null = null;

    function step(ts: number) {
      if (!lastTs) lastTs = ts;
      const raw = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const { mass1: m1, mass2: m2, elastic: isElastic, speed: s } = paramsRef.current;
      const dt = raw * s;
      const r1 = getRadius(m1);
      const r2 = getRadius(m2);

      // Integrate positions
      p1Ref.current += vel1Ref.current * 60 * dt;
      p2Ref.current += vel2Ref.current * 60 * dt;

      // Wall bounce
      if (p1Ref.current - r1 < 0) { p1Ref.current = r1; vel1Ref.current = Math.abs(vel1Ref.current); }
      if (p1Ref.current + r1 > CANVAS_W) { p1Ref.current = CANVAS_W - r1; vel1Ref.current = -Math.abs(vel1Ref.current); }
      if (p2Ref.current - r2 < 0) { p2Ref.current = r2; vel2Ref.current = Math.abs(vel2Ref.current); }
      if (p2Ref.current + r2 > CANVAS_W) { p2Ref.current = CANVAS_W - r2; vel2Ref.current = -Math.abs(vel2Ref.current); }

      // Collision detection
      if (!collidedRef.current && p1Ref.current + r1 >= p2Ref.current - r2) {
        collidedRef.current = true;
        if (isElastic) {
          const newV1 = ((m1 - m2) * vel1Ref.current + 2 * m2 * vel2Ref.current) / (m1 + m2);
          const newV2 = ((m2 - m1) * vel2Ref.current + 2 * m1 * vel1Ref.current) / (m1 + m2);
          vel1Ref.current = newV1;
          vel2Ref.current = newV2;
        } else {
          const vF = (m1 * vel1Ref.current + m2 * vel2Ref.current) / (m1 + m2);
          vel1Ref.current = vF;
          vel2Ref.current = vF;
        }
        setCollided(true);
      }

      drawScene(p1Ref.current, p2Ref.current, vel1Ref.current, vel2Ref.current, collidedRef.current);
      setDispV1(+vel1Ref.current.toFixed(2));
      setDispV2(+vel2Ref.current.toFixed(2));
      setDispP1(+p1Ref.current.toFixed(0));
      setDispP2(+p2Ref.current.toFixed(0));

      // Stop when both objects have moved far apart after collision and are slowing
      const gap = p2Ref.current - r2 - (p1Ref.current + r1);
      if (collidedRef.current && gap > 400) {
        setRunning(false);
        setDone(true);
        return;
      }

      animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [running, drawScene]);

  // ---------- Canvas drag ----------
  function toCanvas(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (CANVAS_W / r.width),
      y: (e.clientY - r.top) * (CANVAS_H / r.height),
    };
  }

  function whichObject(cx: number, cy: number): 0 | 1 | 2 {
    const { mass1: m1, mass2: m2 } = paramsRef.current;
    const r1 = getRadius(m1) + 12, r2 = getRadius(m2) + 12;
    if (Math.hypot(cx - p1Ref.current, cy - (GROUND_Y - getRadius(m1))) < r1) return 1;
    if (Math.hypot(cx - p2Ref.current, cy - (GROUND_Y - getRadius(m2))) < r2) return 2;
    return 0;
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (running) return;
    const { x, y } = toCanvas(e);
    const which = whichObject(x, y);
    if (which) {
      draggingRef.current = which;
      setCursor("grabbing");
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = toCanvas(e);
    if (!running && draggingRef.current) {
      const { mass1: m1, mass2: m2 } = paramsRef.current;
      if (draggingRef.current === 1) {
        p1Ref.current = clampPos(x, getRadius(m1));
        setDispP1(+p1Ref.current.toFixed(0));
      } else {
        p2Ref.current = clampPos(x, getRadius(m2));
        setDispP2(+p2Ref.current.toFixed(0));
      }
      drawScene(p1Ref.current, p2Ref.current, vel1Ref.current, vel2Ref.current, collidedRef.current);
    } else if (!running) {
      setCursor(whichObject(x, y) ? "grab" : "default");
    }
  }

  function handleMouseUp() {
    draggingRef.current = 0;
    setCursor("default");
  }

  // ---------- Controls ----------
  function doReset() {
    cancelAnimationFrame(animRef.current);
    setRunning(false);
    setCollided(false);
    setDone(false);
    collidedRef.current = false;
    p1Ref.current = 150;
    p2Ref.current = 550;
    vel1Ref.current = v1Init;
    vel2Ref.current = v2Init;
    setDispP1(150);
    setDispP2(550);
    setDispV1(v1Init);
    setDispV2(v2Init);
    drawScene(150, 550, v1Init, v2Init, false);
  }

  function handleStart() {
    p1Ref.current = 150;
    p2Ref.current = 550;
    vel1Ref.current = v1Init;
    vel2Ref.current = v2Init;
    collidedRef.current = false;
    setCollided(false);
    setDone(false);
    setDispV1(v1Init);
    setDispV2(v2Init);
    setRunning(true);
  }

  const momentumBefore = mass1 * v1Init + mass2 * v2Init;
  const keBefore = 0.5 * mass1 * v1Init ** 2 + 0.5 * mass2 * v2Init ** 2;
  const keAfter = collided
    ? 0.5 * mass1 * dispV1 ** 2 + 0.5 * mass2 * dispV2 ** 2
    : keBefore;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card>
        <CardContent className="p-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full rounded-lg bg-background border select-none"
            style={{ cursor }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Badge
                variant={elastic ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => { setElastic(true); doReset(); }}
              >
                Elastic
              </Badge>
              <Badge
                variant={!elastic ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => { setElastic(false); doReset(); }}
              >
                Inelastic
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-blue-500">Mass 1: {mass1} kg</Label>
              <Slider value={[mass1]} onValueChange={(v) => { setMass1(sliderVal(v)); doReset(); }} min={1} max={10} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs text-red-500">Mass 2: {mass2} kg</Label>
              <Slider value={[mass2]} onValueChange={(v) => { setMass2(sliderVal(v)); doReset(); }} min={1} max={10} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs text-blue-500">Velocity 1: {v1Init > 0 ? "+" : ""}{v1Init} m/s</Label>
              <Slider value={[v1Init]} onValueChange={(v) => { setV1Init(sliderVal(v)); doReset(); }} min={-12} max={12} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs text-red-500">Velocity 2: {v2Init > 0 ? "+" : ""}{v2Init} m/s</Label>
              <Slider value={[v2Init]} onValueChange={(v) => { setV2Init(sliderVal(v)); doReset(); }} min={-12} max={12} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Speed: {speed === 1 ? "1× (real-time)" : `${speed}×`}</Label>
              <Slider value={[speed]} onValueChange={(v) => setSpeed(sliderVal(v))} min={0.25} max={4} step={0.25} />
            </div>

            <div className="flex gap-2">
              {running ? (
                <Button variant="outline" onClick={() => { cancelAnimationFrame(animRef.current); setRunning(false); }} className="flex-1">
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              ) : done ? (
                <Button onClick={doReset} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-1" /> New Run
                </Button>
              ) : collided || dispP1 !== 150 || dispP2 !== 550 ? (
                <Button onClick={() => setRunning(true)} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : (
                <Button onClick={handleStart} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Go
                </Button>
              )}
              <Button variant="outline" onClick={doReset} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Conservation Laws</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Momentum p</span>
              <span className="font-mono">{momentumBefore.toFixed(2)} kg·m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KE before</span>
              <span className="font-mono">{keBefore.toFixed(2)} J</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KE after</span>
              <span className="font-mono">{keAfter.toFixed(2)} J</span>
            </div>
            {collided && (
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">KE lost</span>
                <span className="font-mono text-amber-600">{Math.max(0, keBefore - keAfter).toFixed(2)} J</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">v₁</span>
              <span className="font-mono">{dispV1} m/s</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">v₂</span>
              <span className="font-mono">{dispV2} m/s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
