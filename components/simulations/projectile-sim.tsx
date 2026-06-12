"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

export function ProjectileSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [angle, setAngle] = useState(45);
  const [velocity, setVelocity] = useState(20);
  const [gravity, setGravity] = useState(9.8);
  const [height, setHeight] = useState(0);
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [trajectory, setTrajectory] = useState<Point[]>([]);

  const SCALE = 8;
  const GROUND_Y = 350;
  const ORIGIN_X = 60;

  // Use full quadratic formula to account for launch height:
  // y = height + v*sin(θ)*t - 0.5*g*t² = 0  →  t = (v*sinθ + √(v²sin²θ + 2gh)) / g
  const vSinTheta = velocity * Math.sin((angle * Math.PI) / 180);
  const discriminant = vSinTheta * vSinTheta + 2 * gravity * height;
  const totalTime = discriminant > 0
    ? (vSinTheta + Math.sqrt(discriminant)) / gravity
    : (2 * vSinTheta) / gravity;
  const range = velocity * Math.cos((angle * Math.PI) / 180) * totalTime;
  const maxHeight = height + (vSinTheta * vSinTheta) / (2 * gravity);

  const getPosition = useCallback(
    (t: number): Point => ({
      x: velocity * Math.cos((angle * Math.PI) / 180) * t,
      y:
        height +
        velocity * Math.sin((angle * Math.PI) / 180) * t -
        0.5 * gravity * t * t,
    }),
    [velocity, angle, gravity, height]
  );

  const draw = useCallback(
    (currentTime: number, trail: Point[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ground
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(canvas.width, GROUND_Y);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = "#888";
      ctx.font = "11px sans-serif";
      for (let d = 0; d <= 80; d += 10) {
        const x = ORIGIN_X + d * SCALE;
        ctx.fillText(`${d}m`, x - 8, GROUND_Y + 16);
      }
      for (let h = 0; h <= 40; h += 10) {
        const y = GROUND_Y - h * SCALE;
        if (h > 0) ctx.fillText(`${h}m`, 4, y + 4);
      }

      // Trajectory trail
      if (trail.length > 1) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(
          ORIGIN_X + trail[0].x * SCALE,
          GROUND_Y - trail[0].y * SCALE
        );
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(
            ORIGIN_X + trail[i].x * SCALE,
            GROUND_Y - trail[i].y * SCALE
          );
        }
        ctx.stroke();
      }

      // Current position
      const pos = getPosition(currentTime);
      if (pos.y >= 0 || trail.length === 0) {
        const drawPos = pos.y >= 0 ? pos : trail[trail.length - 1] ?? { x: 0, y: 0 };
        ctx.beginPath();
        ctx.arc(
          ORIGIN_X + drawPos.x * SCALE,
          GROUND_Y - drawPos.y * SCALE,
          6,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "#ef4444";
        ctx.fill();
      }

      // Velocity arrow at origin
      const arrowLen = 40;
      const ax = ORIGIN_X + arrowLen * Math.cos((angle * Math.PI) / 180);
      const ay = GROUND_Y - arrowLen * Math.sin((angle * Math.PI) / 180);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ORIGIN_X, GROUND_Y);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - 8 * Math.cos((angle * Math.PI) / 180 - 0.3),
        ay + 8 * Math.sin((angle * Math.PI) / 180 - 0.3)
      );
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - 8 * Math.cos((angle * Math.PI) / 180 + 0.3),
        ay + 8 * Math.sin((angle * Math.PI) / 180 + 0.3)
      );
      ctx.stroke();
    },
    [GROUND_Y, ORIGIN_X, SCALE, angle, getPosition]
  );

  useEffect(() => {
    if (!running) {
      draw(time, trajectory);
      return;
    }

    let startTs: number | null = null;
    const trail: Point[] = [...trajectory];

    function step(ts: number) {
      if (!startTs) startTs = ts;
      const elapsed = (ts - startTs) / 1000 + time;

      const pos = getPosition(elapsed);
      if (pos.y < 0) {
        setRunning(false);
        setTime(elapsed);
        return;
      }

      trail.push(pos);
      setTrajectory([...trail]);
      setTime(elapsed);
      draw(elapsed, trail);
      animationRef.current = requestAnimationFrame(step);
    }

    animationRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationRef.current);
  }, [running, time, trajectory, draw, getPosition]);

  useEffect(() => {
    draw(0, []);
  }, [draw]);

  function handleLaunch() {
    setTrajectory([]);
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
    setRunning(false);
    setTrajectory([]);
    setTime(0);
    cancelAnimationFrame(animationRef.current);
    draw(0, []);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card>
        <CardContent className="p-4">
          <canvas
            ref={canvasRef}
            width={740}
            height={400}
            className="w-full rounded-lg bg-background border"
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs">Angle: {angle}°</Label>
              <Slider
                value={[angle]}
                onValueChange={(val) => {
                  const v = Array.isArray(val) ? val[0] : val;
                  setAngle(v);
                  handleReset();
                }}
                min={5}
                max={85}
                step={1}
                disabled={running}
              />
            </div>
            <div>
              <Label className="text-xs">Velocity: {velocity} m/s</Label>
              <Slider
                value={[velocity]}
                onValueChange={(val) => {
                  const v = Array.isArray(val) ? val[0] : val;
                  setVelocity(v);
                  handleReset();
                }}
                min={5}
                max={40}
                step={1}
                disabled={running}
              />
            </div>
            <div>
              <Label className="text-xs">Launch height: {height} m</Label>
              <Slider
                value={[height]}
                onValueChange={(val) => {
                  const v = Array.isArray(val) ? val[0] : val;
                  setHeight(v);
                  handleReset();
                }}
                min={0}
                max={30}
                step={1}
                disabled={running}
              />
            </div>
            <div>
              <Label className="text-xs">Gravity: {gravity} m/s²</Label>
              <Slider
                value={[gravity]}
                onValueChange={(val) => {
                  const v = Array.isArray(val) ? val[0] : val;
                  setGravity(v);
                  handleReset();
                }}
                min={1}
                max={20}
                step={0.1}
                disabled={running}
              />
            </div>
            <div className="flex gap-2">
              {running ? (
                <Button variant="outline" onClick={handlePause} className="flex-1">
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              ) : time > 0 && trajectory.length > 0 ? (
                <Button onClick={handleResume} className="flex-1">
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              ) : (
                <Button onClick={handleLaunch} className="flex-1">
                  <Play className="h-4 w-4 mr-1" />
                  Launch
                </Button>
              )}
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Predicted Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Range</span>
              <span className="font-mono">{range.toFixed(1)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Height</span>
              <span className="font-mono">{maxHeight.toFixed(1)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Flight Time</span>
              <span className="font-mono">{totalTime.toFixed(2)} s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Time</span>
              <span className="font-mono">{time.toFixed(2)} s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
