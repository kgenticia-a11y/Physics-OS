"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProjectileSim } from "@/components/simulations/projectile-sim";
import { CollisionSim } from "@/components/simulations/collision-sim";
import { SpringSim } from "@/components/simulations/spring-sim";
import { InclinedPlaneSim } from "@/components/simulations/inclined-plane-sim";
import { PendulumSim } from "@/components/simulations/pendulum-sim";

const simTitles: Record<string, string> = {
  projectile: "Projectile Motion",
  collision: "Collisions",
  spring: "Spring Oscillator",
  "inclined-plane": "Inclined Plane",
  pendulum: "Pendulum",
};

const simComponents: Record<string, React.ComponentType> = {
  projectile: ProjectileSim,
  collision: CollisionSim,
  spring: SpringSim,
  "inclined-plane": InclinedPlaneSim,
  pendulum: PendulumSim,
};

export default function SimulationPage() {
  const { slug } = useParams<{ slug: string }>();
  const title = simTitles[slug] ?? "Simulation";
  const SimComponent = simComponents[slug];

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/simulations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>

      {SimComponent ? (
        <SimComponent />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Not found</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This simulation doesn&apos;t exist. Go back to see available simulations.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
