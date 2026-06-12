"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw } from "lucide-react";

export function SpringSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const [mass, setMass] = useState(2);
  const [springK, setSpringK] = useState(10);
  const [damping, setDamping] = useState(0.1);
  const [initDisplacement, setInitDisplacement] = useState(100);
  const [running, setRunning] = useState(false);

  const [displacement, setDisplacement] = useState(100);
  const [velocity, setVelocity] = useState(0);
  const [time, setTime] = useState(0);

  const CANVAS_W = 740;
  const CANVAS_H = 350;
  const ANCHOR_X = 60;
  const REST_Y = CANVAS_H / 2;

  const period = 2 * Math.PI * Math.sqrt(mass / springK);
  const frequency = 1 / period;

  const drawSpring = useCallback(
    (ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) => {
      const coils = 12;
      const amplitude = 15;
      const dx = endX - startX;
      const dy = endY - startY;
      const len = Math.sqrt(dx * dx + dy * dy);

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      for (let i = 0; i <= coils * 2; i++) {
        const t = i / (coils * 2);
        const x = startX + dx * t;
        const y = startY + dy * t + (i % 2 === 0 ? 1 : -1) * amplitude * (i > 0 && i < coils * 2 ? 1 : 0);
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = "#888";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    []
  );

  const draw = useCallback(
    (disp: number, vel: number, t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Wall
      ctx.fillStyle = "#666";
      ctx.fillRect(0, REST_Y - 80, ANCHOR_X, 160);
      ctx.strokeStyle = "#888";
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(ANCHOR_X - 15, REST_Y - 70 + i * 20);
        ctx.lineTo(ANCHOR_X, REST_Y - 60 + i * 20);
        ctx.stroke();
      }

      // Rest position line
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(350, REST_Y - 60);
      ctx.lineTo(350, REST_Y + 60);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#ccc";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("equilibrium", 350, REST_Y + 75);

      const blockX = 350 + disp;
      const blockSize = 20 + mass * 4;

      // Spring
      drawSpring(ctx, ANCHOR_X, REST_Y, blockX - blockSize / 2, REST_Y);

      // Block
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(
        blockX - blockSize / 2,
        REST_Y - blockSize / 2,
        blockSize,
        blockSize
      );
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${mass}kg`, blockX, REST_Y + 4);

      // Force arrow
      const force = -springK * (disp / 100);
      if (Math.abs(force) > 0.3) {
        const arrowLen = force * 15;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(blockX, REST_Y - blockSize / 2 - 15);
        ctx.lineTo(blockX + arrowLen, REST_Y - blockSize / 2 - 15);
        ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.font = "10px sans-serif";
        ctx.fillText("F", blockX + arrowLen / 2, REST_Y - blockSize / 2 - 22);
      }

      // Trail (energy bar)
      const pe = 0.5 * springK * (disp / 100) * (disp / 100);
      const ke = 0.5 * mass * (vel / 100) * (vel / 100);
      const totalE = pe + ke;
      const barWidth = 200;
      const barX = CANVAS_W - barWidth - 30;
      const barY = 30;

      ctx.fillStyle = "#eee";
      ctx.fillRect(barX, barY, barWidth, 20);
      if (totalE > 0) {
        const peWidth = (pe / totalE) * barWidth;
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(barX, barY, peWidth, 20);
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(barX + peWidth, barY, barWidth - peWidth, 20);
      }
      ctx.fillStyle = "#666";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("PE", barX + 4, barY + 14);
      ctx.textAlign = "right";
      ctx.fillText("KE", barX + barWidth - 4, barY + 14);

      // Info
      ctx.fillStyle = "#888";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`t = ${t.toFixed(2)}s`, 20, 30);
      ctx.fillText(`x = ${(disp / 100).toFixed(2)}m`, 20, 46);
    },
    [mass, springK, drawSpring]
  );

  useEffect(() => {
    if (!running) {
      draw(displacement, velocity, time);
      return;
    }

    let lastTs: number | null = null;
    let d = displacement;
    let v = velocity;
    let t = time;

    function step(ts: number) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.02);
      lastTs = ts;

      const acc = (-springK * (d / 100) - damping * (v / 100)) / mass;
      v += acc * 100 * dt;
      d += v * dt;
      t += dt;

      setDisplacement(d);
      setVelocity(v);
      setTime(t);

      draw(d, v, t);
      animationRef.current = requestAnimationFrame(step);
    }

    animationRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationRef.current);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    setDisplacement(initDisplacement);
    setVelocity(0);
    setTime(0);
    setRunning(true);
  }

  function handlePause() {
    cancelAnimationFrame(animationRef.current);
    setRunning(false);
  }

  function handleResume() {
    setRunning(true);
  }

  function handleReset() {
    cancelAnimationFrame(animationRef.current);
    setRunning(false);
    setDisplacement(initDisplacement);
    setVelocity(0);
    setTime(0);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card>
        <CardContent className="p-4">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="w-full rounded-lg bg-background border" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Controls</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs">Mass: {mass} kg</Label>
              <Slider value={[mass]} onValueChange={(val) => { setMass(Array.isArray(val) ? val[0] : val); handleReset(); }} min={0.5} max={10} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Spring constant k: {springK} N/m</Label>
              <Slider value={[springK]} onValueChange={(val) => { setSpringK(Array.isArray(val) ? val[0] : val); handleReset(); }} min={1} max={50} step={1} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Initial stretch: {(initDisplacement / 100).toFixed(1)} m</Label>
              <Slider value={[initDisplacement]} onValueChange={(val) => { setInitDisplacement(Array.isArray(val) ? val[0] : val); handleReset(); }} min={20} max={200} step={10} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Damping: {damping}</Label>
              <Slider value={[damping]} onValueChange={(val) => { setDamping(Array.isArray(val) ? val[0] : val); handleReset(); }} min={0} max={5} step={0.1} disabled={running} />
            </div>
            <div className="flex gap-2">
              {running ? (
                <Button variant="outline" onClick={handlePause} className="flex-1">
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              ) : time > 0 ? (
                <Button onClick={handleResume} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : (
                <Button onClick={handleStart} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Release
                </Button>
              )}
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Predicted Values</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Period</span>
              <span className="font-mono">{period.toFixed(2)} s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frequency</span>
              <span className="font-mono">{frequency.toFixed(2)} Hz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Angular freq</span>
              <span className="font-mono">{(2 * Math.PI * frequency).toFixed(2)} rad/s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
