"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw } from "lucide-react";

export function InclinedPlaneSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const [angle, setAngle] = useState(30);
  const [mass, setMass] = useState(3);
  const [friction, setFriction] = useState(0.2);
  const [running, setRunning] = useState(false);

  const [position, setPosition] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [time, setTime] = useState(0);

  const CANVAS_W = 740;
  const CANVAS_H = 400;
  const g = 9.8;

  const rad = (angle * Math.PI) / 180;
  const normalForce = mass * g * Math.cos(rad);
  const gravComponent = mass * g * Math.sin(rad);
  const frictionForce = friction * normalForce;
  const netForce = gravComponent - frictionForce;
  const acceleration = netForce > 0 ? netForce / mass : 0;

  const draw = useCallback(
    (pos: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const rampBaseX = 80;
      const rampBaseY = 340;
      const rampLen = 500;
      const rampEndX = rampBaseX + rampLen * Math.cos(rad);
      const rampEndY = rampBaseY - rampLen * Math.sin(rad);

      // Ground
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rampBaseY);
      ctx.lineTo(CANVAS_W, rampBaseY);
      ctx.stroke();

      // Ramp
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.moveTo(rampBaseX, rampBaseY);
      ctx.lineTo(rampEndX, rampEndY);
      ctx.lineTo(rampEndX, rampBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#999";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Angle arc — from ground (0 = right) to ramp direction (-rad = up-right)
      ctx.beginPath();
      ctx.arc(rampBaseX, rampBaseY, 40, 0, -rad, true);
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#666";
      ctx.font = "12px sans-serif";
      const labelAngle = -rad / 2;
      ctx.fillText(`${angle}°`, rampBaseX + 48 * Math.cos(labelAngle), rampBaseY + 48 * Math.sin(labelAngle) + 4);

      // Block position along ramp
      const blockDist = Math.min(pos * 30, rampLen - 30);
      const startDist = rampLen * 0.7;
      const blockOnRamp = startDist - blockDist;

      if (blockOnRamp < 0) {
        setRunning(false);
        return;
      }

      const blockCenterX = rampBaseX + blockOnRamp * Math.cos(rad);
      const blockCenterY = rampBaseY - blockOnRamp * Math.sin(rad);
      const blockSize = 20 + mass * 3;

      ctx.save();
      ctx.translate(blockCenterX, blockCenterY);
      ctx.rotate(-rad);

      // Block
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(-blockSize / 2, -blockSize, blockSize, blockSize);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${mass}kg`, 0, -blockSize / 2 + 4);

      // Force vectors
      const forceScale = 3;

      // Weight (down, in rotated frame it's at an angle)
      ctx.restore();
      ctx.save();
      ctx.translate(blockCenterX, blockCenterY);

      // Gravity
      const gLen = mass * g * forceScale * 0.3;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -blockSize / 2);
      ctx.lineTo(0, -blockSize / 2 + gLen);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("mg", 5, -blockSize / 2 + gLen / 2);

      // Normal force
      const nLen = normalForce * forceScale * 0.3;
      ctx.strokeStyle = "#22c55e";
      ctx.beginPath();
      ctx.moveTo(0, -blockSize / 2);
      ctx.lineTo(-nLen * Math.sin(rad), -blockSize / 2 - nLen * Math.cos(rad));
      ctx.stroke();
      ctx.fillStyle = "#22c55e";
      ctx.fillText("N", -nLen * Math.sin(rad) - 15, -blockSize / 2 - nLen * Math.cos(rad));

      // Friction (up the ramp)
      if (friction > 0 && netForce > 0) {
        const fLen = frictionForce * forceScale * 0.3;
        ctx.strokeStyle = "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(0, -blockSize / 2);
        ctx.lineTo(-fLen * Math.cos(rad), -blockSize / 2 + fLen * Math.sin(rad));
        ctx.stroke();
        ctx.fillStyle = "#f59e0b";
        ctx.fillText("f", -fLen * Math.cos(rad) - 10, -blockSize / 2 + fLen * Math.sin(rad));
      }

      ctx.restore();
    },
    [angle, mass, friction, rad, normalForce, frictionForce, netForce]
  );

  useEffect(() => {
    draw(position);
  }, [draw, position]);

  useEffect(() => {
    if (!running) return;

    let lastTs: number | null = null;
    let p = position;
    let v = velocity;
    let t = time;

    function step(ts: number) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.02);
      lastTs = ts;

      if (acceleration > 0) {
        v += acceleration * dt;
        p += v * dt;
        t += dt;

        setPosition(p);
        setVelocity(v);
        setTime(t);

        draw(p);

        if (p > 15) {
          setRunning(false);
          return;
        }
      }

      animationRef.current = requestAnimationFrame(step);
    }

    animationRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationRef.current);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    setPosition(0);
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
    setPosition(0);
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
              <Label className="text-xs">Angle: {angle}°</Label>
              <Slider value={[angle]} onValueChange={(val) => { setAngle(Array.isArray(val) ? val[0] : val); handleReset(); }} min={5} max={75} step={1} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Mass: {mass} kg</Label>
              <Slider value={[mass]} onValueChange={(val) => { setMass(Array.isArray(val) ? val[0] : val); handleReset(); }} min={1} max={10} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Friction (μ): {friction}</Label>
              <Slider value={[friction]} onValueChange={(val) => { setFriction(Array.isArray(val) ? val[0] : val); handleReset(); }} min={0} max={1} step={0.05} disabled={running} />
            </div>
            <div className="flex gap-2">
              {running ? (
                <Button variant="outline" onClick={handlePause} className="flex-1">
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              ) : time > 0 && position < 15 ? (
                <Button onClick={handleResume} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : (
                <Button onClick={handleStart} disabled={acceleration <= 0} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Release
                </Button>
              )}
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
            {acceleration <= 0 && (
              <p className="text-xs text-amber-600">Friction prevents motion at this angle</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Forces</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weight (mg)</span>
              <span className="font-mono">{(mass * g).toFixed(1)} N</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Normal force</span>
              <span className="font-mono">{normalForce.toFixed(1)} N</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">mg sin θ</span>
              <span className="font-mono">{gravComponent.toFixed(1)} N</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Friction</span>
              <span className="font-mono">{frictionForce.toFixed(1)} N</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Net force</span>
              <span className="font-mono font-medium">{netForce.toFixed(1)} N</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Acceleration</span>
              <span className="font-mono">{acceleration.toFixed(2)} m/s²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Velocity</span>
              <span className="font-mono">{velocity.toFixed(2)} m/s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
