"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw } from "lucide-react";

const CANVAS_W = 740;
const CANVAS_H = 420;
const GROUND_Y = 370;
const ORIGIN_X = 60;
const SCALE = 8;
const TRAIL_MAX = 400;

function sliderVal(v: number | readonly number[]): number {
  return typeof v === "number" ? v : v[0];
}

export function ProjectileSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Params
  const [angle, setAngle] = useState(45);
  const [velocity, setVelocity] = useState(20);
  const [launchHeight, setLaunchHeight] = useState(0);
  const [gravity, setGravity] = useState(9.8);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [landed, setLanded] = useState(false);

  // Display
  const [dispTime, setDispTime] = useState(0);
  const [dispX, setDispX] = useState(0);
  const [dispY, setDispY] = useState(0);
  const [cursor, setCursor] = useState<"default" | "crosshair">("crosshair");

  // Physics refs
  const timeRef = useRef(0);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const landedRef = useRef(false);

  // Dragging the launch angle arrow
  const draggingAngleRef = useRef(false);

  const paramsRef = useRef({ angle: 45, velocity: 20, launchHeight: 0, gravity: 9.8, speed: 1 });
  useEffect(() => {
    paramsRef.current = { angle, velocity, launchHeight, gravity, speed };
  }, [angle, velocity, launchHeight, gravity, speed]);

  // Derived (for panel display)
  const rad = (angle * Math.PI) / 180;
  const vSin = velocity * Math.sin(rad);
  const disc = vSin * vSin + 2 * gravity * launchHeight;
  const totalTime = disc >= 0 ? (vSin + Math.sqrt(disc)) / gravity : 0;
  const range = velocity * Math.cos(rad) * totalTime;
  const maxH = launchHeight + (vSin * vSin) / (2 * gravity);

  // Position at time t
  function getPos(t: number, p = paramsRef.current) {
    const r2 = (p.angle * Math.PI) / 180;
    return {
      x: p.velocity * Math.cos(r2) * t,
      y: p.launchHeight + p.velocity * Math.sin(r2) * t - 0.5 * p.gravity * t * t,
    };
  }

  // ---------- Drawing ----------
  const drawScene = useCallback(
    (trail: { x: number; y: number }[], curT: number, isDone: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const p = paramsRef.current;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      skyGrad.addColorStop(0, "rgba(219,234,254,0.18)");
      skyGrad.addColorStop(1, "transparent");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

      // Ground
      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_W, GROUND_Y);
      ctx.stroke();

      // Grid lines + axis labels
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = "rgba(150,150,150,0.2)";
      ctx.lineWidth = 1;
      for (let d = 10; d <= 80; d += 10) {
        const x = ORIGIN_X + d * SCALE;
        if (x > CANVAS_W) break;
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y - 4);
        ctx.lineTo(x, GROUND_Y - 300);
        ctx.stroke();
      }
      for (let h2 = 10; h2 <= 40; h2 += 10) {
        const y = GROUND_Y - h2 * SCALE;
        if (y < 0) break;
        ctx.beginPath();
        ctx.moveTo(ORIGIN_X, y);
        ctx.lineTo(CANVAS_W - 10, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.fillStyle = "#9ca3af";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      for (let d = 0; d <= 80; d += 10) {
        const x = ORIGIN_X + d * SCALE;
        if (x > CANVAS_W - 10) break;
        ctx.fillText(`${d}m`, x, GROUND_Y + 14);
      }
      ctx.textAlign = "right";
      for (let h2 = 10; h2 <= 40; h2 += 10) {
        const y = GROUND_Y - h2 * SCALE;
        if (y < 4) break;
        ctx.fillText(`${h2}m`, ORIGIN_X - 4, y + 4);
      }

      // Predicted arc (dashed)
      const r2 = (p.angle * Math.PI) / 180;
      const vSin2 = p.velocity * Math.sin(r2);
      const disc2 = vSin2 * vSin2 + 2 * p.gravity * p.launchHeight;
      const tFlight = disc2 >= 0 ? (vSin2 + Math.sqrt(disc2)) / p.gravity : 0;
      if (tFlight > 0) {
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "rgba(59,130,246,0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const t2 = (i / steps) * tFlight;
          const pos = getPos(t2, p);
          const cx = ORIGIN_X + pos.x * SCALE;
          const cy = GROUND_Y - pos.y * SCALE;
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Trail
      if (trail.length > 1) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.stroke();
      }

      // Launch height platform
      if (p.launchHeight > 0) {
        const platformY = GROUND_Y - p.launchHeight * SCALE;
        ctx.fillStyle = "#6b7280";
        ctx.fillRect(ORIGIN_X - 20, platformY, 30, GROUND_Y - platformY);
        ctx.fillStyle = "#9ca3af";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${p.launchHeight}m`, ORIGIN_X + 14, platformY - 2);
      }

      // Launch angle arrow
      const launchY = GROUND_Y - p.launchHeight * SCALE;
      const arrowLen = 52;
      const ax = ORIGIN_X + arrowLen * Math.cos(r2);
      const ay = launchY - arrowLen * Math.sin(r2);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ORIGIN_X, launchY);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      // Arrowhead
      const aHead = 9;
      for (const sign of [-0.35, 0.35]) {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(
          ax - aHead * Math.cos(r2 - sign),
          ay + aHead * Math.sin(r2 - sign)
        );
        ctx.stroke();
      }
      ctx.fillStyle = "#16a34a";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${p.angle}° / ${p.velocity} m/s`, ax + 6, ay - 4);

      // Projectile ball
      const pos = getPos(curT, p);
      const ballX = ORIGIN_X + pos.x * SCALE;
      const ballY = GROUND_Y - Math.max(0, pos.y) * SCALE;
      const ballGrad = ctx.createRadialGradient(ballX - 3, ballY - 3, 1, ballX, ballY, 8);
      ballGrad.addColorStop(0, "#fca5a5");
      ballGrad.addColorStop(1, "#dc2626");
      ctx.beginPath();
      ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
      ctx.fillStyle = ballGrad;
      ctx.fill();

      // Range marker when done
      if (isDone && trail.length > 0) {
        const lastPt = trail[trail.length - 1];
        ctx.strokeStyle = "#ef4444";
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lastPt.x, GROUND_Y);
        ctx.lineTo(lastPt.x, lastPt.y);
        ctx.stroke();
        ctx.setLineDash([]);
        const rangeM = (lastPt.x - ORIGIN_X) / SCALE;
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Range: ${rangeM.toFixed(1)} m`, lastPt.x, GROUND_Y + 26);
      }

      // Tip
      ctx.fillStyle = "rgba(156,163,175,0.9)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Drag arrow tip to set angle", 14, CANVAS_H - 12);
    },
    [] // reads from paramsRef
  );

  // Draw on param change while not running
  useEffect(() => {
    if (!running) {
      trailRef.current = [];
      timeRef.current = 0;
      landedRef.current = false;
      drawScene([], 0, false);
      setDispTime(0);
      setDispX(0);
      setDispY(0);
      setLanded(false);
    }
  }, [drawScene, angle, velocity, launchHeight, gravity, running]);

  // ---------- Animation loop (only restarts when running changes) ----------
  useEffect(() => {
    if (!running) return;
    let lastTs: number | null = null;

    function step(ts: number) {
      if (!lastTs) lastTs = ts;
      const raw = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const { speed: s, gravity: g } = paramsRef.current;
      timeRef.current += raw * s;
      const pos = getPos(timeRef.current);

      // Has it landed?
      if (pos.y < 0) {
        landedRef.current = true;
        setLanded(true);
        setRunning(false);
        drawScene(trailRef.current, timeRef.current, true);
        return;
      }

      const cx = ORIGIN_X + pos.x * SCALE;
      const cy = GROUND_Y - pos.y * SCALE;
      trailRef.current.push({ x: cx, y: cy });
      if (trailRef.current.length > TRAIL_MAX) trailRef.current.shift();

      drawScene(trailRef.current, timeRef.current, false);
      setDispTime(+timeRef.current.toFixed(2));
      setDispX(+pos.x.toFixed(1));
      setDispY(+pos.y.toFixed(1));

      animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // ---------- Canvas interaction (drag arrow tip to set angle) ----------
  function toCanvas(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (CANVAS_W / r.width),
      y: (e.clientY - r.top) * (CANVAS_H / r.height),
    };
  }

  function arrowTipHit(cx: number, cy: number) {
    const p = paramsRef.current;
    const r2 = (p.angle * Math.PI) / 180;
    const launchY = GROUND_Y - p.launchHeight * SCALE;
    const ax = ORIGIN_X + 52 * Math.cos(r2);
    const ay = launchY - 52 * Math.sin(r2);
    return Math.hypot(cx - ax, cy - ay) < 18;
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (running) return;
    const { x, y } = toCanvas(e);
    if (arrowTipHit(x, y)) {
      draggingAngleRef.current = true;
      setCursor("crosshair");
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = toCanvas(e);
    if (!running && draggingAngleRef.current) {
      const launchY = GROUND_Y - paramsRef.current.launchHeight * SCALE;
      const dx = x - ORIGIN_X;
      const dy = launchY - y;
      const newAngle = Math.round(
        Math.max(1, Math.min(89, (Math.atan2(dy, dx) * 180) / Math.PI))
      );
      setAngle(newAngle);
    } else if (!running) {
      setCursor(arrowTipHit(x, y) ? "crosshair" : "default");
    }
  }

  function handleMouseUp() {
    draggingAngleRef.current = false;
  }

  // ---------- Controls ----------
  function handleLaunch() {
    timeRef.current = 0;
    trailRef.current = [];
    landedRef.current = false;
    setDispTime(0);
    setDispX(0);
    setDispY(0);
    setLanded(false);
    setRunning(true);
  }

  function handleReset() {
    cancelAnimationFrame(animRef.current);
    setRunning(false);
    setLanded(false);
    timeRef.current = 0;
    trailRef.current = [];
    landedRef.current = false;
    setDispTime(0);
    setDispX(0);
    setDispY(0);
    drawScene([], 0, false);
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
              <Label className="text-xs">Launch angle: {angle}°</Label>
              <Slider
                value={[angle]}
                onValueChange={(v) => setAngle(sliderVal(v))}
                min={1} max={89} step={1}
                disabled={running}
              />
            </div>
            <div>
              <Label className="text-xs">Initial velocity: {velocity} m/s</Label>
              <Slider
                value={[velocity]}
                onValueChange={(v) => setVelocity(sliderVal(v))}
                min={1} max={50} step={1}
                disabled={running}
              />
            </div>
            <div>
              <Label className="text-xs">Launch height: {launchHeight} m</Label>
              <Slider
                value={[launchHeight]}
                onValueChange={(v) => setLaunchHeight(sliderVal(v))}
                min={0} max={40} step={1}
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
              ) : dispTime > 0 && !landed ? (
                <Button onClick={() => setRunning(true)} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : (
                <Button onClick={handleLaunch} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Launch
                </Button>
              )}
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Predictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Range</span>
              <span className="font-mono">{range.toFixed(1)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max height</span>
              <span className="font-mono">{maxH.toFixed(1)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Flight time</span>
              <span className="font-mono">{totalTime.toFixed(2)} s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current time</span>
              <span className="font-mono">{dispTime} s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position x</span>
              <span className="font-mono">{dispX} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position y</span>
              <span className="font-mono">{dispY} m</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
