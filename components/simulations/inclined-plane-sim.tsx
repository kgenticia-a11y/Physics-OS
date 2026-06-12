"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw } from "lucide-react";

const CANVAS_W = 740;
const CANVAS_H = 420;
const RAMP_BASE_X = 80;
const RAMP_BASE_Y = 360;
const RAMP_LEN = 520;

function sliderVal(v: number | readonly number[]): number {
  return typeof v === "number" ? v : v[0];
}

export function InclinedPlaneSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Params
  const [angle, setAngle] = useState(30);
  const [mass, setMass] = useState(3);
  const [friction, setFriction] = useState(0.2);
  const [gravity, setGravity] = useState(9.8);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);

  // Display
  const [dispPos, setDispPos] = useState(0);    // metres along ramp from top
  const [dispVel, setDispVel] = useState(0);    // m/s
  const [dispTime, setDispTime] = useState(0);
  const [cursor, setCursor] = useState<"default" | "grab" | "grabbing">("default");

  // Physics refs — position in metres along ramp from start (top)
  const posRef = useRef(0);
  const velRef = useRef(0);
  const tRef = useRef(0);
  const stoppedRef = useRef(false);   // avoids calling setState from draw
  const draggingRef = useRef(false);

  const paramsRef = useRef({ angle: 30, mass: 3, friction: 0.2, gravity: 9.8, speed: 1 });
  useEffect(() => {
    paramsRef.current = { angle, mass, friction, gravity, speed };
  }, [angle, mass, friction, gravity, speed]);

  // Derived forces
  const rad = (angle * Math.PI) / 180;
  const N = mass * gravity * Math.cos(rad);
  const gravComp = mass * gravity * Math.sin(rad);
  const frictionF = friction * N;
  const netF = gravComp - frictionF;
  const accel = netF > 0 ? netF / mass : 0;

  // Ramp geometry helpers
  function rampEnd() {
    return {
      x: RAMP_BASE_X + RAMP_LEN * Math.cos(rad),
      y: RAMP_BASE_Y - RAMP_LEN * Math.sin(rad),
    };
  }

  // Convert position along ramp (metres) to canvas coords
  // Block starts near top of ramp; positive pos = sliding down
  const PX_PER_M = 40;
  function blockCanvasPos(posM: number) {
    const startFrac = 0.85; // start 85% up the ramp
    const rampPx = RAMP_LEN * startFrac - posM * PX_PER_M;
    const clampedPx = Math.max(0, rampPx);
    return {
      cx: RAMP_BASE_X + clampedPx * Math.cos(rad),
      cy: RAMP_BASE_Y - clampedPx * Math.sin(rad),
    };
  }

  // ---------- Drawing ----------
  const drawScene = useCallback(
    (posM: number, velMs: number, t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { angle: a, mass: m, friction: mu, gravity: g } = paramsRef.current;
      const r = (a * Math.PI) / 180;
      const endX = RAMP_BASE_X + RAMP_LEN * Math.cos(r);
      const endY = RAMP_BASE_Y - RAMP_LEN * Math.sin(r);

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, RAMP_BASE_Y);
      skyGrad.addColorStop(0, "rgba(219,234,254,0.12)");
      skyGrad.addColorStop(1, "transparent");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, RAMP_BASE_Y);

      // Ground line
      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, RAMP_BASE_Y);
      ctx.lineTo(CANVAS_W, RAMP_BASE_Y);
      ctx.stroke();

      // Ramp fill
      ctx.beginPath();
      ctx.moveTo(RAMP_BASE_X, RAMP_BASE_Y);
      ctx.lineTo(endX, endY);
      ctx.lineTo(endX, RAMP_BASE_Y);
      ctx.closePath();
      ctx.fillStyle = "#e5e7eb";
      ctx.fill();
      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Angle arc
      ctx.beginPath();
      ctx.arc(RAMP_BASE_X, RAMP_BASE_Y, 44, 0, -r, true);
      ctx.strokeStyle = "#6b7280";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const midA = -r / 2;
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${a}°`, RAMP_BASE_X + 52 * Math.cos(midA) + 2, RAMP_BASE_Y + 52 * Math.sin(midA) + 4);

      // Block
      const { cx, cy } = blockCanvasPos(posM);
      const bs = 22 + m * 3;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-r);

      const grad = ctx.createLinearGradient(-bs / 2, -bs, bs / 2, 0);
      grad.addColorStop(0, "#93c5fd");
      grad.addColorStop(1, "#2563eb");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(-bs / 2, -bs, bs, bs, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(9, Math.round(bs * 0.38))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${m}kg`, 0, -bs / 2 + 4);

      ctx.restore();

      // Force vectors (from block centre, in world coords)
      const fx = cx;
      const fy = cy - bs / 2; // block centre-ish
      const fScale = 0.28;

      // Gravity (downward)
      const gLen = m * paramsRef.current.gravity * fScale;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy + gLen);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("mg", fx + 4, fy + gLen * 0.55);

      // Normal (perpendicular to ramp)
      const nAng = -(r + Math.PI / 2);
      const nLen = m * paramsRef.current.gravity * Math.cos(r) * fScale;
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + nLen * Math.cos(nAng), fy + nLen * Math.sin(nAng));
      ctx.stroke();
      ctx.fillStyle = "#22c55e";
      ctx.fillText("N", fx + nLen * Math.cos(nAng) + 4, fy + nLen * Math.sin(nAng));

      // Friction (up the ramp, opposing motion when sliding down)
      const frF = mu * m * paramsRef.current.gravity * Math.cos(r);
      const gravS = m * paramsRef.current.gravity * Math.sin(r);
      if (frF > 0 && gravS > frF) {
        const frLen = frF * fScale;
        // Up the ramp direction
        const upX = -Math.cos(r);
        const upY = Math.sin(r);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + upX * frLen, fy + upY * frLen);
        ctx.stroke();
        ctx.fillStyle = "#f59e0b";
        ctx.fillText("f", fx + upX * frLen - 10, fy + upY * frLen - 4);
      }

      // Telemetry
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`t = ${t.toFixed(2)} s`, 14, 22);
      ctx.fillText(`v = ${velMs.toFixed(2)} m/s`, 14, 38);
      ctx.fillText(`d = ${posM.toFixed(2)} m down ramp`, 14, 54);

      // Drag hint
      ctx.fillStyle = "rgba(156,163,175,0.75)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Drag block to set start position", 14, CANVAS_H - 10);
    },
    [] // reads from paramsRef
  );

  useEffect(() => {
    if (!running) {
      drawScene(posRef.current, velRef.current, tRef.current);
    }
  }, [drawScene, angle, mass, friction, gravity, running]);

  // ---------- Animation loop ----------
  useEffect(() => {
    if (!running) return;
    let lastTs: number | null = null;

    function step(ts: number) {
      if (!lastTs) lastTs = ts;
      const raw = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const { mass: m, friction: mu, gravity: g, angle: a, speed: s } = paramsRef.current;
      const r2 = (a * Math.PI) / 180;
      const netAcc = g * Math.sin(r2) - mu * g * Math.cos(r2);

      if (netAcc <= 0) {
        // Friction prevents motion — stop and do nothing
        stoppedRef.current = true;
        setRunning(false);
        return;
      }

      const substeps = Math.max(1, Math.ceil((raw * s) / 0.004));
      const dt = (raw * s) / substeps;

      for (let i = 0; i < substeps; i++) {
        velRef.current += netAcc * dt;
        posRef.current += velRef.current * dt;
      }
      tRef.current += raw * s;

      const maxPos = (RAMP_LEN * 0.85) / 40; // metres to bottom
      if (posRef.current >= maxPos) {
        posRef.current = maxPos;
        velRef.current = 0;
        drawScene(posRef.current, 0, tRef.current);
        setDispPos(+posRef.current.toFixed(2));
        setDispVel(0);
        setDispTime(+tRef.current.toFixed(2));
        stoppedRef.current = true;
        setRunning(false);
        return;
      }

      drawScene(posRef.current, velRef.current, tRef.current);
      setDispPos(+posRef.current.toFixed(2));
      setDispVel(+velRef.current.toFixed(2));
      setDispTime(+tRef.current.toFixed(2));

      animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [running, drawScene]);

  // ---------- Canvas drag ----------
  function toCanvas(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r2 = c.getBoundingClientRect();
    return {
      x: (e.clientX - r2.left) * (CANVAS_W / r2.width),
      y: (e.clientY - r2.top) * (CANVAS_H / r2.height),
    };
  }

  function nearBlock(cx: number, cy: number) {
    const { cx: bx, cy: by } = blockCanvasPos(posRef.current);
    return Math.hypot(cx - bx, cy - by) < 35;
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (running) return;
    const { x, y } = toCanvas(e);
    if (nearBlock(x, y)) {
      draggingRef.current = true;
      setCursor("grabbing");
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = toCanvas(e);
    if (!running && draggingRef.current) {
      const r2 = rad;
      // Project mouse onto ramp line to get distance from base
      const dx = x - RAMP_BASE_X;
      const dy = RAMP_BASE_Y - y;
      const onRamp = dx * Math.cos(r2) + dy * Math.sin(r2);
      // Convert ramp pixels to position (distance slid from start)
      const startPx = RAMP_LEN * 0.85;
      const posM = Math.max(0, Math.min(10, (startPx - onRamp) / PX_PER_M));
      posRef.current = posM;
      velRef.current = 0;
      tRef.current = 0;
      setDispPos(+posM.toFixed(2));
      setDispVel(0);
      setDispTime(0);
      drawScene(posM, 0, 0);
    } else if (!running) {
      setCursor(nearBlock(x, y) ? "grab" : "default");
    }
  }

  function handleMouseUp() {
    draggingRef.current = false;
    setCursor("default");
  }

  // ---------- Controls ----------
  function doReset() {
    cancelAnimationFrame(animRef.current);
    setRunning(false);
    stoppedRef.current = false;
    posRef.current = 0;
    velRef.current = 0;
    tRef.current = 0;
    setDispPos(0);
    setDispVel(0);
    setDispTime(0);
    drawScene(0, 0, 0);
  }

  function handleStart() {
    stoppedRef.current = false;
    velRef.current = 0;
    tRef.current = 0;
    setDispVel(0);
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
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Angle: {angle}°</Label>
              <Slider value={[angle]} onValueChange={(v) => { setAngle(sliderVal(v)); doReset(); }} min={5} max={85} step={1} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Mass: {mass.toFixed(1)} kg</Label>
              <Slider value={[mass]} onValueChange={(v) => { setMass(sliderVal(v)); doReset(); }} min={0.5} max={15} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Friction μ: {friction.toFixed(2)}</Label>
              <Slider value={[friction]} onValueChange={(v) => { setFriction(sliderVal(v)); doReset(); }} min={0} max={1} step={0.01} />
            </div>
            <div>
              <Label className="text-xs">Gravity: {gravity.toFixed(1)} m/s²</Label>
              <Slider value={[gravity]} onValueChange={(v) => setGravity(sliderVal(v))} min={0.5} max={25} step={0.1} />
            </div>
            <div>
              <Label className="text-xs">Speed: {speed === 1 ? "1× (real-time)" : `${speed}×`}</Label>
              <Slider value={[speed]} onValueChange={(v) => setSpeed(sliderVal(v))} min={0.25} max={4} step={0.25} />
            </div>

            {accel <= 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                Friction holds the block — increase angle or reduce μ
              </p>
            )}

            <div className="flex gap-2">
              {running ? (
                <Button variant="outline" onClick={() => { cancelAnimationFrame(animRef.current); setRunning(false); }} className="flex-1">
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              ) : dispTime > 0 && !stoppedRef.current ? (
                <Button onClick={() => setRunning(true)} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : (
                <Button onClick={handleStart} disabled={accel <= 0} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Release
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
            <CardTitle className="text-sm">Forces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weight mg</span>
              <span className="font-mono">{(mass * gravity).toFixed(1)} N</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Normal N</span>
              <span className="font-mono">{N.toFixed(1)} N</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">mg sin θ</span>
              <span className="font-mono">{gravComp.toFixed(1)} N</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Friction f = μN</span>
              <span className="font-mono">{frictionF.toFixed(1)} N</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Net force</span>
              <span className={`font-mono font-medium ${netF > 0 ? "text-green-600" : "text-amber-600"}`}>
                {netF.toFixed(1)} N
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Acceleration</span>
              <span className="font-mono">{accel.toFixed(3)} m/s²</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Velocity</span>
              <span className="font-mono">{dispVel} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance slid</span>
              <span className="font-mono">{dispPos} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-mono">{dispTime} s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
