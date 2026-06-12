"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw } from "lucide-react";

export function CollisionSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const [mass1, setMass1] = useState(2);
  const [mass2, setMass2] = useState(1);
  const [v1, setV1] = useState(5);
  const [v2, setV2] = useState(-3);
  const [elastic, setElastic] = useState(true);
  const [running, setRunning] = useState(false);
  const [collided, setCollided] = useState(false);

  const [pos1, setPos1] = useState(150);
  const [pos2, setPos2] = useState(550);
  const [vel1, setVel1] = useState(5);
  const [vel2, setVel2] = useState(-3);

  const CANVAS_W = 740;
  const CANVAS_H = 300;
  const GROUND_Y = 220;
  const SCALE = 3;

  function getRadius(m: number) {
    return 15 + m * 5;
  }

  const draw = useCallback(
    (p1: number, p2: number, currentV1: number, currentV2: number, hasCollided: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Ground
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_W, GROUND_Y);
      ctx.stroke();

      const r1 = getRadius(mass1);
      const r2 = getRadius(mass2);

      // Object 1
      ctx.beginPath();
      ctx.arc(p1, GROUND_Y - r1, r1, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${mass1}kg`, p1, GROUND_Y - r1 + 4);

      // Object 2
      ctx.beginPath();
      ctx.arc(p2, GROUND_Y - r2, r2, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(`${mass2}kg`, p2, GROUND_Y - r2 + 4);

      // Velocity arrows
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      if (Math.abs(currentV1) > 0.1) {
        const arrowLen = currentV1 * 8;
        ctx.beginPath();
        ctx.moveTo(p1, GROUND_Y - r1 * 2 - 10);
        ctx.lineTo(p1 + arrowLen, GROUND_Y - r1 * 2 - 10);
        ctx.stroke();
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.moveTo(p1 + arrowLen, GROUND_Y - r1 * 2 - 15);
        ctx.lineTo(p1 + arrowLen + (currentV1 > 0 ? 8 : -8), GROUND_Y - r1 * 2 - 10);
        ctx.lineTo(p1 + arrowLen, GROUND_Y - r1 * 2 - 5);
        ctx.fill();
      }

      ctx.strokeStyle = "#ef4444";
      if (Math.abs(currentV2) > 0.1) {
        const arrowLen = currentV2 * 8;
        ctx.beginPath();
        ctx.moveTo(p2, GROUND_Y - r2 * 2 - 10);
        ctx.lineTo(p2 + arrowLen, GROUND_Y - r2 * 2 - 10);
        ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(p2 + arrowLen, GROUND_Y - r2 * 2 - 15);
        ctx.lineTo(p2 + arrowLen + (currentV2 > 0 ? 8 : -8), GROUND_Y - r2 * 2 - 10);
        ctx.lineTo(p2 + arrowLen, GROUND_Y - r2 * 2 - 5);
        ctx.fill();
      }

      // Labels
      ctx.fillStyle = "#888";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`v = ${currentV1.toFixed(1)} m/s`, p1, GROUND_Y + 20);
      ctx.fillText(`v = ${currentV2.toFixed(1)} m/s`, p2, GROUND_Y + 20);

      if (hasCollided) {
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("Collision!", CANVAS_W / 2, 30);
      }
    },
    [mass1, mass2]
  );

  useEffect(() => {
    draw(pos1, pos2, vel1, vel2, collided);
  }, [draw, pos1, pos2, vel1, vel2, collided]);

  useEffect(() => {
    if (!running) return;

    let lastTs: number | null = null;
    let p1 = pos1;
    let p2 = pos2;
    let cV1 = vel1;
    let cV2 = vel2;
    let hasCollided = collided;

    function step(ts: number) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      p1 += cV1 * SCALE * dt * 60;
      p2 += cV2 * SCALE * dt * 60;

      const r1 = getRadius(mass1);
      const r2 = getRadius(mass2);

      if (!hasCollided && p1 + r1 >= p2 - r2) {
        hasCollided = true;
        if (elastic) {
          const newV1 =
            ((mass1 - mass2) * cV1 + 2 * mass2 * cV2) / (mass1 + mass2);
          const newV2 =
            ((mass2 - mass1) * cV2 + 2 * mass1 * cV1) / (mass1 + mass2);
          cV1 = newV1;
          cV2 = newV2;
        } else {
          const vFinal = (mass1 * cV1 + mass2 * cV2) / (mass1 + mass2);
          cV1 = vFinal;
          cV2 = vFinal;
        }
        setCollided(true);
        setVel1(cV1);
        setVel2(cV2);
      }

      setPos1(p1);
      setPos2(p2);

      if (p1 < -50 || p1 > CANVAS_W + 50 || p2 < -50 || p2 > CANVAS_W + 50) {
        setRunning(false);
        return;
      }

      draw(p1, p2, cV1, cV2, hasCollided);
      animationRef.current = requestAnimationFrame(step);
    }

    animationRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationRef.current);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    setPos1(150);
    setPos2(550);
    setVel1(v1);
    setVel2(v2);
    setCollided(false);
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
    setCollided(false);
    setPos1(150);
    setPos2(550);
    setVel1(v1);
    setVel2(v2);
  }

  const totalMomentumBefore = mass1 * v1 + mass2 * v2;
  const keBefore = 0.5 * mass1 * v1 * v1 + 0.5 * mass2 * v2 * v2;
  const keAfter = collided
    ? 0.5 * mass1 * vel1 * vel1 + 0.5 * mass2 * vel2 * vel2
    : keBefore;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card>
        <CardContent className="p-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full rounded-lg bg-background border"
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
                onClick={() => { setElastic(true); handleReset(); }}
              >
                Elastic
              </Badge>
              <Badge
                variant={!elastic ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => { setElastic(false); handleReset(); }}
              >
                Inelastic
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-blue-500">Mass 1: {mass1} kg</Label>
              <Slider value={[mass1]} onValueChange={(val) => { setMass1(Array.isArray(val) ? val[0] : val); handleReset(); }} min={1} max={10} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs text-red-500">Mass 2: {mass2} kg</Label>
              <Slider value={[mass2]} onValueChange={(val) => { setMass2(Array.isArray(val) ? val[0] : val); handleReset(); }} min={1} max={10} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs text-blue-500">Velocity 1: {v1} m/s</Label>
              <Slider value={[v1]} onValueChange={(val) => { setV1(Array.isArray(val) ? val[0] : val); handleReset(); }} min={-10} max={10} step={0.5} disabled={running} />
            </div>
            <div>
              <Label className="text-xs text-red-500">Velocity 2: {v2} m/s</Label>
              <Slider value={[v2]} onValueChange={(val) => { setV2(Array.isArray(val) ? val[0] : val); handleReset(); }} min={-10} max={10} step={0.5} disabled={running} />
            </div>
            <div className="flex gap-2">
              {running ? (
                <Button variant="outline" onClick={handlePause} className="flex-1">
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              ) : collided || pos1 !== 150 || pos2 !== 550 ? (
                <Button onClick={handleResume} className="flex-1" disabled={collided && !running && (pos1 < -50 || pos2 > 800)}>
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : (
                <Button onClick={handleStart} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Go
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
            <CardTitle className="text-sm">Physics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Momentum</span>
              <span className="font-mono">{totalMomentumBefore.toFixed(1)} kg·m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KE Before</span>
              <span className="font-mono">{keBefore.toFixed(1)} J</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KE After</span>
              <span className="font-mono">{keAfter.toFixed(1)} J</span>
            </div>
            {collided && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">KE Lost</span>
                <span className="font-mono">{(keBefore - keAfter).toFixed(1)} J</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
