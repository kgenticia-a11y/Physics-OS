"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw } from "lucide-react";

const TRAIL_MAX = 55;
const CANVAS_W = 740;
const CANVAS_H = 440;
const PIVOT_X = 370;
const PIVOT_Y = 60;
const PX_PER_M = 108;

function sliderVal(v: number | readonly number[]): number {
  return typeof v === "number" ? v : v[0];
}

export function PendulumSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // --- Simulation params ---
  const [length, setLength] = useState(2);
  const [mass, setMass] = useState(2);
  const [initAngle, setInitAngle] = useState(30);
  const [gravity, setGravity] = useState(9.8);
  const [damping, setDamping] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);

  // --- Display state (synced from refs each frame) ---
  const [dispAngle, setDispAngle] = useState(30);
  const [dispOmega, setDispOmega] = useState(0);
  const [dispTime, setDispTime] = useState(0);
  const [cursor, setCursor] = useState<"default" | "grab" | "grabbing">("default");

  // --- Physics refs (live values never stale in animation loop) ---
  const thRef = useRef((30 * Math.PI) / 180);
  const omRef = useRef(0);
  const tRef = useRef(0);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const draggingRef = useRef(false);

  // --- Params ref so animation loop always reads latest without restarts ---
  const paramsRef = useRef({ length: 2, mass: 2, gravity: 9.8, damping: 0, speed: 1 });
  useEffect(() => {
    paramsRef.current = { length, mass, gravity, damping, speed };
  }, [length, mass, gravity, damping, speed]);

  const period = 2 * Math.PI * Math.sqrt(length / gravity);
  const vMax = Math.sqrt(2 * gravity * length * (1 - Math.cos((initAngle * Math.PI) / 180)));

  // ---------- Drawing ----------
  const drawScene = useCallback(
    (th: number, om: number, t: number, trail: { x: number; y: number }[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { length: L, mass: m, gravity: g } = paramsRef.current;
      const rodLen = L * PX_PER_M;
      const bobR = 12 + m * 2;
      const bx = PIVOT_X + rodLen * Math.sin(th);
      const by = PIVOT_Y + rodLen * Math.cos(th);

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Dashed vertical reference
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(150,150,150,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PIVOT_X, PIVOT_Y);
      ctx.lineTo(PIVOT_X, PIVOT_Y + rodLen + bobR + 24);
      ctx.stroke();
      ctx.setLineDash([]);

      // Trail
      for (let i = 1; i < trail.length; i++) {
        const a = (i / trail.length) * 0.38;
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, bobR * 0.36, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${a})`;
        ctx.fill();
      }

      // Angle arc + label
      if (Math.abs(th) > 0.008) {
        const arcR = 52;
        const sa = Math.PI / 2, ea = Math.PI / 2 - th;
        ctx.beginPath();
        ctx.arc(PIVOT_X, PIVOT_Y, arcR, Math.min(sa, ea), Math.max(sa, ea));
        ctx.strokeStyle = "#818cf8";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const midA = (sa + ea) / 2;
        ctx.fillStyle = "#6366f1";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `${((th * 180) / Math.PI).toFixed(1)}°`,
          PIVOT_X + (arcR + 22) * Math.cos(midA),
          PIVOT_Y + (arcR + 22) * Math.sin(midA)
        );
      }

      // Rod
      ctx.beginPath();
      ctx.moveTo(PIVOT_X, PIVOT_Y);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pivot pin
      ctx.beginPath();
      ctx.arc(PIVOT_X, PIVOT_Y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#374151";
      ctx.fill();

      // Bob gradient
      const grad = ctx.createRadialGradient(bx - bobR * 0.3, by - bobR * 0.3, 1, bx, by, bobR);
      grad.addColorStop(0, "#a5b4fc");
      grad.addColorStop(1, "#4338ca");
      ctx.beginPath();
      ctx.arc(bx, by, bobR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(9, Math.round(bobR * 0.52))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${m}kg`, bx, by + 4);

      // Energy bar (top-right)
      const h = L * (1 - Math.cos(th));
      const pe = m * g * h;
      const ke = 0.5 * m * (L * om) ** 2;
      const totalE = pe + ke;
      const bw = 200, bX = CANVAS_W - bw - 18, bY = 16;
      ctx.fillStyle = "rgba(220,220,220,0.8)";
      ctx.fillRect(bX, bY, bw, 18);
      if (totalE > 0.001) {
        const pw = (pe / totalE) * bw;
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(bX, bY, pw, 18);
        ctx.fillStyle = "#6366f1";
        ctx.fillRect(bX + pw, bY, bw - pw, 18);
      }
      ctx.fillStyle = "#444";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("PE", bX + 4, bY + 13);
      ctx.textAlign = "right";
      ctx.fillText("KE", bX + bw - 4, bY + 13);

      // Telemetry
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`t = ${t.toFixed(2)} s`, 14, 22);
      ctx.fillText(`ω = ${om.toFixed(3)} rad/s`, 14, 38);
    },
    [] // no deps — reads live from paramsRef
  );

  // Re-draw whenever params change while paused
  useEffect(() => {
    if (!running) {
      drawScene(thRef.current, omRef.current, tRef.current, trailRef.current);
    }
  }, [drawScene, length, mass, gravity, running]);

  // ---------- Animation loop ----------
  useEffect(() => {
    if (!running) return;
    let lastTs: number | null = null;

    function step(ts: number) {
      if (!lastTs) lastTs = ts;
      const raw = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const { gravity: g, length: L, damping: b, mass: m, speed: s } = paramsRef.current;
      // Sub-step for numerical stability at high speed / small dt
      const substeps = Math.max(1, Math.ceil((raw * s) / 0.004));
      const dt = (raw * s) / substeps;

      for (let i = 0; i < substeps; i++) {
        // Full nonlinear: θ'' = -(g/L)sin θ - (b / mL²)θ'
        const alpha =
          -(g / L) * Math.sin(thRef.current) -
          (b / (m * L * L)) * omRef.current;
        omRef.current += alpha * dt;
        thRef.current += omRef.current * dt;
      }
      tRef.current += raw * s;

      // Real position trail
      const bx = PIVOT_X + L * PX_PER_M * Math.sin(thRef.current);
      const by = PIVOT_Y + L * PX_PER_M * Math.cos(thRef.current);
      trailRef.current.push({ x: bx, y: by });
      if (trailRef.current.length > TRAIL_MAX) trailRef.current.shift();

      drawScene(thRef.current, omRef.current, tRef.current, trailRef.current);

      setDispAngle(+(thRef.current * (180 / Math.PI)).toFixed(1));
      setDispOmega(+omRef.current.toFixed(3));
      setDispTime(+tRef.current.toFixed(2));

      animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [running, drawScene]); // drawScene is stable; speed/gravity/etc read from paramsRef

  // ---------- Canvas interaction ----------
  function toCanvas(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (CANVAS_W / r.width),
      y: (e.clientY - r.top) * (CANVAS_H / r.height),
    };
  }

  function nearBob(cx: number, cy: number) {
    const L = paramsRef.current.length;
    const m = paramsRef.current.mass;
    const bx = PIVOT_X + L * PX_PER_M * Math.sin(thRef.current);
    const by = PIVOT_Y + L * PX_PER_M * Math.cos(thRef.current);
    return Math.hypot(cx - bx, cy - by) < 12 + m * 2 + 14;
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (running) return;
    const { x, y } = toCanvas(e);
    if (nearBob(x, y)) {
      draggingRef.current = true;
      setCursor("grabbing");
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = toCanvas(e);
    if (!running && draggingRef.current) {
      const th = Math.max(
        -(Math.PI * 0.97),
        Math.min(Math.PI * 0.97, Math.atan2(x - PIVOT_X, y - PIVOT_Y))
      );
      thRef.current = th;
      omRef.current = 0;
      trailRef.current = [];
      const deg = Math.abs(Math.round((th * 180) / Math.PI));
      setInitAngle(deg);
      setDispAngle(+((th * 180) / Math.PI).toFixed(1));
      setDispOmega(0);
      drawScene(th, 0, tRef.current, []);
    } else if (!running) {
      setCursor(nearBob(x, y) ? "grab" : "default");
    }
  }

  function handleMouseUp() {
    if (draggingRef.current) {
      draggingRef.current = false;
      setCursor("default");
    }
  }

  // ---------- Controls ----------
  function doReset(angle = initAngle) {
    cancelAnimationFrame(animRef.current);
    setRunning(false);
    thRef.current = (angle * Math.PI) / 180;
    omRef.current = 0;
    tRef.current = 0;
    trailRef.current = [];
    setDispAngle(angle);
    setDispOmega(0);
    setDispTime(0);
    drawScene((angle * Math.PI) / 180, 0, 0, []);
  }

  function handleStart() {
    thRef.current = (initAngle * Math.PI) / 180;
    omRef.current = 0;
    tRef.current = 0;
    trailRef.current = [];
    setDispAngle(initAngle);
    setDispOmega(0);
    setDispTime(0);
    setRunning(true);
  }

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
          {!running && (
            <p className="text-xs text-center text-muted-foreground mt-1.5">
              Drag the bob to set angle · Gravity &amp; damping update live
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Length: {length.toFixed(1)} m</Label>
              <Slider
                value={[length]}
                onValueChange={(v) => { setLength(sliderVal(v)); doReset(); }}
                min={0.3} max={4} step={0.1}
                disabled={running}
              />
            </div>
            <div>
              <Label className="text-xs">Mass: {mass.toFixed(1)} kg</Label>
              <Slider
                value={[mass]}
                onValueChange={(v) => { setMass(sliderVal(v)); doReset(); }}
                min={0.5} max={10} step={0.5}
                disabled={running}
              />
            </div>
            <div>
              <Label className="text-xs">Initial angle: {initAngle}°</Label>
              <Slider
                value={[initAngle]}
                onValueChange={(v) => {
                  const deg = sliderVal(v);
                  setInitAngle(deg);
                  if (!running) {
                    thRef.current = (deg * Math.PI) / 180;
                    omRef.current = 0;
                    trailRef.current = [];
                    setDispAngle(deg);
                    setDispOmega(0);
                    drawScene(thRef.current, 0, tRef.current, []);
                  }
                }}
                min={1} max={170} step={1}
                disabled={running}
              />
            </div>
            <div>
              <Label className="text-xs">Gravity: {gravity.toFixed(1)} m/s²</Label>
              <Slider
                value={[gravity]}
                onValueChange={(v) => setGravity(sliderVal(v))}
                min={0.5} max={25} step={0.1}
              />
            </div>
            <div>
              <Label className="text-xs">Air resistance: {damping.toFixed(2)}</Label>
              <Slider
                value={[damping]}
                onValueChange={(v) => setDamping(sliderVal(v))}
                min={0} max={2} step={0.05}
              />
            </div>
            <div>
              <Label className="text-xs">
                Speed: {speed === 1 ? "1× (real-time)" : `${speed}×`}
              </Label>
              <Slider
                value={[speed]}
                onValueChange={(v) => setSpeed(sliderVal(v))}
                min={0.25} max={4} step={0.25}
              />
            </div>

            <div className="flex gap-2">
              {running ? (
                <Button
                  variant="outline"
                  onClick={() => { cancelAnimationFrame(animRef.current); setRunning(false); }}
                  className="flex-1"
                >
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              ) : dispTime > 0 ? (
                <Button onClick={() => setRunning(true)} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : (
                <Button onClick={handleStart} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Release
                </Button>
              )}
              <Button variant="outline" onClick={() => doReset()} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Live Measurements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Period (2π√L/g)</span>
              <span className="font-mono">{period.toFixed(3)} s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max speed</span>
              <span className="font-mono">{vMax.toFixed(3)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Angle θ</span>
              <span className="font-mono">{dispAngle.toFixed ? dispAngle.toFixed(1) : dispAngle}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Angular vel ω</span>
              <span className="font-mono">{dispOmega} rad/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time elapsed</span>
              <span className="font-mono">{dispTime} s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
