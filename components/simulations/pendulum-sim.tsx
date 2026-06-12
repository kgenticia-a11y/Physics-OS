"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw } from "lucide-react";

export function PendulumSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const [length, setLength] = useState(2);
  const [mass, setMass] = useState(2);
  const [initAngle, setInitAngle] = useState(30);
  const [gravity, setGravity] = useState(9.8);
  const [running, setRunning] = useState(false);

  const [theta, setTheta] = useState((30 * Math.PI) / 180);
  const [omega, setOmega] = useState(0);
  const [time, setTime] = useState(0);

  const CANVAS_W = 740;
  const CANVAS_H = 400;
  const PIVOT_X = 370;
  const PIVOT_Y = 50;
  const SCALE = 100;

  const period = 2 * Math.PI * Math.sqrt(length / gravity);
  const maxSpeed = Math.sqrt(2 * gravity * length * (1 - Math.cos((initAngle * Math.PI) / 180)));

  const draw = useCallback(
    (currentTheta: number, currentOmega: number, t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const rodLen = length * SCALE;
      const bobR = 10 + mass * 3;
      const bobX = PIVOT_X + rodLen * Math.sin(currentTheta);
      const bobY = PIVOT_Y + rodLen * Math.cos(currentTheta);

      // Pivot
      ctx.beginPath();
      ctx.arc(PIVOT_X, PIVOT_Y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#666";
      ctx.fill();

      // Vertical reference
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PIVOT_X, PIVOT_Y);
      ctx.lineTo(PIVOT_X, PIVOT_Y + rodLen + bobR + 20);
      ctx.stroke();
      ctx.setLineDash([]);

      // Angle arc
      if (Math.abs(currentTheta) > 0.02) {
        ctx.beginPath();
        const arcR = 40;
        const startAngle = Math.PI / 2;
        const endAngle = Math.PI / 2 - currentTheta;
        ctx.arc(PIVOT_X, PIVOT_Y, arcR, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#3b82f6";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        const labelAngle = (startAngle + endAngle) / 2;
        ctx.fillText(
          `${((currentTheta * 180) / Math.PI).toFixed(1)}°`,
          PIVOT_X + (arcR + 15) * Math.cos(labelAngle),
          PIVOT_Y + (arcR + 15) * Math.sin(labelAngle)
        );
      }

      // Rod
      ctx.beginPath();
      ctx.moveTo(PIVOT_X, PIVOT_Y);
      ctx.lineTo(bobX, bobY);
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bob
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${mass}kg`, bobX, bobY + 4);

      // Trail (faded positions)
      const trailCount = 8;
      for (let i = 1; i <= trailCount; i++) {
        const trailTheta = currentTheta - currentOmega * 0.02 * i;
        const trailX = PIVOT_X + rodLen * Math.sin(trailTheta);
        const trailY = PIVOT_Y + rodLen * Math.cos(trailTheta);
        ctx.beginPath();
        ctx.arc(trailX, trailY, bobR * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${0.15 - i * 0.015})`;
        ctx.fill();
      }

      // Energy bar
      const height = length * (1 - Math.cos(currentTheta));
      const pe = mass * gravity * height;
      const ke = 0.5 * mass * (length * currentOmega) * (length * currentOmega);
      const totalE = pe + ke;
      const barWidth = 180;
      const barX = CANVAS_W - barWidth - 30;
      const barY = 30;

      ctx.fillStyle = "#eee";
      ctx.fillRect(barX, barY, barWidth, 20);
      if (totalE > 0.001) {
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

      // Time
      ctx.fillStyle = "#888";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`t = ${t.toFixed(2)}s`, 20, 30);
    },
    [length, mass, gravity]
  );

  useEffect(() => {
    draw(theta, omega, time);
  }, [draw, theta, omega, time]);

  useEffect(() => {
    if (!running) return;

    let lastTs: number | null = null;
    let th = theta;
    let om = omega;
    let t = time;

    function step(ts: number) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.02);
      lastTs = ts;

      // Full nonlinear equation: θ'' = -(g/L)sin(θ)
      const alpha = -(gravity / length) * Math.sin(th);
      om += alpha * dt;
      th += om * dt;
      t += dt;

      setTheta(th);
      setOmega(om);
      setTime(t);

      draw(th, om, t);
      animationRef.current = requestAnimationFrame(step);
    }

    animationRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationRef.current);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    const th = (initAngle * Math.PI) / 180;
    setTheta(th);
    setOmega(0);
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
    setTheta((initAngle * Math.PI) / 180);
    setOmega(0);
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
              <Label className="text-xs">Length: {length} m</Label>
              <Slider value={[length]} onValueChange={(val) => { setLength(Array.isArray(val) ? val[0] : val); handleReset(); }} min={0.5} max={3} step={0.1} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Mass: {mass} kg</Label>
              <Slider value={[mass]} onValueChange={(val) => { setMass(Array.isArray(val) ? val[0] : val); handleReset(); }} min={0.5} max={5} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Initial angle: {initAngle}°</Label>
              <Slider value={[initAngle]} onValueChange={(val) => { setInitAngle(Array.isArray(val) ? val[0] : val); handleReset(); }} min={5} max={80} step={1} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Gravity: {gravity} m/s²</Label>
              <Slider value={[gravity]} onValueChange={(val) => { setGravity(Array.isArray(val) ? val[0] : val); handleReset(); }} min={1} max={20} step={0.1} disabled={running} />
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
              <span className="text-muted-foreground">Period (small angle)</span>
              <span className="font-mono">{period.toFixed(2)} s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max speed</span>
              <span className="font-mono">{maxSpeed.toFixed(2)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current angle</span>
              <span className="font-mono">{((theta * 180) / Math.PI).toFixed(1)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Angular velocity</span>
              <span className="font-mono">{omega.toFixed(2)} rad/s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
