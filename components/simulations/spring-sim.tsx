"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw } from "lucide-react";

const CANVAS_W = 740;
const CANVAS_H = 360;
const ANCHOR_X = 60;
const REST_X = 340; // equilibrium block left-edge x
const AXIS_Y = CANVAS_H / 2;

function sliderVal(v: number | readonly number[]): number {
  return typeof v === "number" ? v : v[0];
}

function drawSpringPath(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  toX: number,
  y: number
) {
  const coils = 14;
  const amp = 14;
  ctx.beginPath();
  ctx.moveTo(fromX, y);
  const seg = (toX - fromX) / (coils * 2 + 2);
  ctx.lineTo(fromX + seg, y);
  for (let i = 0; i < coils * 2; i++) {
    const x = fromX + seg + (i + 0.5) * seg;
    const yOff = (i % 2 === 0 ? -1 : 1) * amp;
    ctx.lineTo(x, y + yOff);
  }
  ctx.lineTo(toX, y);
  ctx.strokeStyle = "#6b7280";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();
}

export function SpringSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Params
  const [mass, setMass] = useState(2);
  const [springK, setSpringK] = useState(10);
  const [damping, setDamping] = useState(0.1);
  const [initDisp, setInitDisp] = useState(1.2); // metres
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);

  // Display
  const [dispX, setDispX] = useState(1.2);
  const [dispV, setDispV] = useState(0);
  const [dispT, setDispT] = useState(0);
  const [cursor, setCursor] = useState<"default" | "grab" | "grabbing">("default");

  // Physics refs — displacement and velocity in metres
  const xRef = useRef(1.2);   // metres from equilibrium
  const vRef = useRef(0);
  const tRef = useRef(0);
  const draggingRef = useRef(false);

  const paramsRef = useRef({ mass: 2, springK: 10, damping: 0.1, speed: 1 });
  useEffect(() => {
    paramsRef.current = { mass, springK, damping, speed };
  }, [mass, springK, damping, speed]);

  const period = 2 * Math.PI * Math.sqrt(mass / springK);
  const freq = 1 / period;

  // Canvas scale: 1 m = PX_PER_M pixels of displacement
  const PX_PER_M = 130;

  // Block size based on mass
  function blockSize(m: number) {
    return 22 + m * 3.5;
  }

  // Block left-edge x from displacement
  function blockX(dispM: number) {
    return REST_X + dispM * PX_PER_M;
  }

  // ---------- Drawing ----------
  const drawScene = useCallback(
    (dispM: number, velMs: number, t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { mass: m, springK: k } = paramsRef.current;
      const bs = blockSize(m);
      const bx = blockX(dispM);

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Wall
      ctx.fillStyle = "#4b5563";
      ctx.fillRect(0, AXIS_Y - 80, ANCHOR_X, 160);
      ctx.strokeStyle = "#6b7280";
      ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.moveTo(ANCHOR_X - 14, AXIS_Y - 72 + i * 18);
        ctx.lineTo(ANCHOR_X, AXIS_Y - 58 + i * 18);
        ctx.stroke();
      }

      // Equilibrium dashed line
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(156,163,175,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(REST_X + bs / 2, AXIS_Y - bs - 10);
      ctx.lineTo(REST_X + bs / 2, AXIS_Y + 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(156,163,175,0.6)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("x = 0", REST_X + bs / 2, AXIS_Y + 26);

      // Displacement ruler tick
      if (Math.abs(dispM) > 0.02) {
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = "#6366f1";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(REST_X + bs / 2, AXIS_Y + 38);
        ctx.lineTo(bx + bs / 2, AXIS_Y + 38);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#6366f1";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `x = ${dispM > 0 ? "+" : ""}${dispM.toFixed(2)} m`,
          (REST_X + bx) / 2 + bs / 2,
          AXIS_Y + 52
        );
      }

      // Spring
      drawSpringPath(ctx, ANCHOR_X, bx, AXIS_Y);

      // Block gradient
      const grad = ctx.createLinearGradient(bx, AXIS_Y - bs, bx + bs, AXIS_Y);
      grad.addColorStop(0, "#93c5fd");
      grad.addColorStop(1, "#2563eb");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(bx, AXIS_Y - bs, bs, bs, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(9, Math.round(bs * 0.35))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${m}kg`, bx + bs / 2, AXIS_Y - bs / 2 + 4);

      // Restoring force arrow
      const force = -k * dispM;
      if (Math.abs(force) > 0.25) {
        const arrowLen = Math.min(Math.abs(force) * 18, 120) * Math.sign(force);
        const arrowY = AXIS_Y - bs - 22;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx + bs / 2, arrowY);
        ctx.lineTo(bx + bs / 2 + arrowLen, arrowY);
        ctx.stroke();
        const dir = force > 0 ? 1 : -1;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(bx + bs / 2 + arrowLen, arrowY);
        ctx.lineTo(bx + bs / 2 + arrowLen - dir * 9, arrowY - 5);
        ctx.lineTo(bx + bs / 2 + arrowLen - dir * 9, arrowY + 5);
        ctx.closePath();
        ctx.fill();
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`F = ${force.toFixed(1)} N`, bx + bs / 2 + arrowLen / 2, arrowY - 8);
      }

      // Energy bar (top-right)
      const pe = 0.5 * k * dispM * dispM;
      const ke = 0.5 * m * velMs * velMs;
      const totalE = pe + ke;
      const bw = 200, bX2 = CANVAS_W - bw - 18, bY = 16;
      ctx.fillStyle = "rgba(220,220,220,0.8)";
      ctx.fillRect(bX2, bY, bw, 18);
      if (totalE > 0.0001) {
        const pw = (pe / totalE) * bw;
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(bX2, bY, pw, 18);
        ctx.fillStyle = "#6366f1";
        ctx.fillRect(bX2 + pw, bY, bw - pw, 18);
      }
      ctx.fillStyle = "#444";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("PE", bX2 + 4, bY + 13);
      ctx.textAlign = "right";
      ctx.fillText("KE", bX2 + bw - 4, bY + 13);

      // Telemetry
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`t = ${t.toFixed(2)} s`, 14, 22);
      ctx.fillText(`v = ${velMs.toFixed(3)} m/s`, 14, 38);

      // Drag hint
      ctx.fillStyle = "rgba(156,163,175,0.75)";
      ctx.font = "11px sans-serif";
      ctx.fillText("Drag block to set displacement", 14, CANVAS_H - 10);
    },
    [] // reads from paramsRef
  );

  useEffect(() => {
    if (!running) {
      drawScene(xRef.current, vRef.current, tRef.current);
    }
  }, [drawScene, mass, springK, damping, running]);

  // ---------- Animation loop ----------
  useEffect(() => {
    if (!running) return;
    let lastTs: number | null = null;

    function step(ts: number) {
      if (!lastTs) lastTs = ts;
      const raw = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const { mass: m, springK: k, damping: b, speed: s } = paramsRef.current;
      const substeps = Math.max(1, Math.ceil((raw * s) / 0.004));
      const dt = (raw * s) / substeps;

      for (let i = 0; i < substeps; i++) {
        // x'' = -(k/m)x - (b/m)x'
        const acc = -(k / m) * xRef.current - (b / m) * vRef.current;
        vRef.current += acc * dt;
        xRef.current += vRef.current * dt;
      }
      tRef.current += raw * s;

      drawScene(xRef.current, vRef.current, tRef.current);
      setDispX(+xRef.current.toFixed(3));
      setDispV(+vRef.current.toFixed(3));
      setDispT(+tRef.current.toFixed(2));

      animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [running, drawScene]);

  // ---------- Canvas drag ----------
  function toCanvas(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return (e.clientX - r.left) * (CANVAS_W / r.width);
  }

  function onBlockRegion(cx: number) {
    const { mass: m } = paramsRef.current;
    const bs = blockSize(m);
    const bx = blockX(xRef.current);
    return cx >= bx - 10 && cx <= bx + bs + 10;
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (running) return;
    const cx = toCanvas(e);
    if (onBlockRegion(cx)) {
      draggingRef.current = true;
      setCursor("grabbing");
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const cx = toCanvas(e);
    if (!running && draggingRef.current) {
      const { mass: m } = paramsRef.current;
      const bs = blockSize(m);
      // Block centre x
      const centreX = cx - bs / 2;
      // Displacement from REST_X
      const newDisp = (centreX - REST_X) / PX_PER_M;
      const clamped = Math.max(-2.2, Math.min(2.8, newDisp));
      xRef.current = clamped;
      vRef.current = 0;
      setInitDisp(+clamped.toFixed(2));
      setDispX(+clamped.toFixed(3));
      setDispV(0);
      drawScene(clamped, 0, tRef.current);
    } else if (!running) {
      setCursor(onBlockRegion(cx) ? "grab" : "default");
    }
  }

  function handleMouseUp() {
    draggingRef.current = false;
    setCursor("default");
  }

  // ---------- Controls ----------
  function doReset(disp = initDisp) {
    cancelAnimationFrame(animRef.current);
    setRunning(false);
    xRef.current = disp;
    vRef.current = 0;
    tRef.current = 0;
    setDispX(+disp.toFixed(3));
    setDispV(0);
    setDispT(0);
    drawScene(disp, 0, 0);
  }

  function handleStart() {
    xRef.current = initDisp;
    vRef.current = 0;
    tRef.current = 0;
    setDispX(+initDisp.toFixed(3));
    setDispV(0);
    setDispT(0);
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
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Mass: {mass.toFixed(1)} kg</Label>
              <Slider value={[mass]} onValueChange={(v) => { setMass(sliderVal(v)); doReset(); }} min={0.5} max={10} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Spring k: {springK} N/m</Label>
              <Slider value={[springK]} onValueChange={(v) => { setSpringK(sliderVal(v)); doReset(); }} min={1} max={60} step={1} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Initial stretch: {initDisp.toFixed(2)} m</Label>
              <Slider
                value={[initDisp]}
                onValueChange={(v) => {
                  const d = sliderVal(v);
                  setInitDisp(d);
                  if (!running) {
                    xRef.current = d;
                    vRef.current = 0;
                    setDispX(+d.toFixed(3));
                    setDispV(0);
                    drawScene(d, 0, tRef.current);
                  }
                }}
                min={-2.2} max={2.8} step={0.05}
                disabled={running}
              />
            </div>
            <div>
              <Label className="text-xs">Damping: {damping.toFixed(2)}</Label>
              <Slider value={[damping]} onValueChange={(v) => setDamping(sliderVal(v))} min={0} max={5} step={0.05} />
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
              ) : dispT > 0 ? (
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
              <span className="text-muted-foreground">Period T</span>
              <span className="font-mono">{period.toFixed(3)} s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frequency f</span>
              <span className="font-mono">{freq.toFixed(3)} Hz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Angular ω₀</span>
              <span className="font-mono">{(2 * Math.PI * freq).toFixed(3)} rad/s</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Displacement x</span>
              <span className="font-mono">{dispX} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Velocity v</span>
              <span className="font-mono">{dispV} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-mono">{dispT} s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
