"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";

export function EinsteinLoader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const velRef = useRef({
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
  });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const imgSize = 80;
    let x = pos.x;
    let y = pos.y;

    function step() {
      const container = containerRef.current;
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;

      x += velRef.current.vx;
      y += velRef.current.vy;

      // Bounce off walls
      if (x <= 0 || x >= w - imgSize) {
        velRef.current.vx *= -1;
        // Add a little randomness on bounce
        velRef.current.vy += (Math.random() - 0.5) * 1.5;
        x = Math.max(0, Math.min(w - imgSize, x));
      }
      if (y <= 0 || y >= h - imgSize) {
        velRef.current.vy *= -1;
        velRef.current.vx += (Math.random() - 0.5) * 1.5;
        y = Math.max(0, Math.min(h - imgSize, y));
      }

      // Clamp velocity
      const speed = Math.sqrt(velRef.current.vx ** 2 + velRef.current.vy ** 2);
      if (speed > 7) {
        velRef.current.vx *= 7 / speed;
        velRef.current.vy *= 7 / speed;
      }
      if (speed < 2) {
        velRef.current.vx *= 2.5 / speed;
        velRef.current.vy *= 2.5 / speed;
      }

      setPos({ x, y });
      animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="relative w-full h-48 rounded-lg bg-muted/30 overflow-hidden"
    >
      <div
        className="absolute transition-none"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          willChange: "transform",
        }}
      >
        <Image
          src="/einstein.png"
          alt="Einstein thinking"
          width={80}
          height={80}
          className="rounded-full select-none pointer-events-none drop-shadow-md"
          priority
        />
      </div>
      <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-muted-foreground">
        Einstein is thinking...
      </p>
    </div>
  );
}
