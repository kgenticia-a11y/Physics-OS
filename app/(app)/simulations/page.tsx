import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const simulations = [
  {
    slug: "projectile",
    title: "Projectile Motion",
    description: "Launch objects at different angles and velocities. Observe parabolic trajectories, range, and maximum height in real time.",
    topics: ["Kinematics"],
    params: ["Launch angle", "Initial velocity", "Gravity"],
    color: "from-blue-600 to-blue-800",
    iconBg: "bg-blue-700",
    icon: "🎯",
  },
  {
    slug: "collision",
    title: "Collisions",
    description: "Explore elastic and inelastic collisions. Watch momentum conservation and energy transfer unfold between two masses.",
    topics: ["Momentum"],
    params: ["Mass 1 & 2", "Velocity 1 & 2", "Elastic / Inelastic"],
    color: "from-red-600 to-red-800",
    iconBg: "bg-red-700",
    icon: "💥",
  },
  {
    slug: "spring",
    title: "Spring Oscillator",
    description: "Observe simple harmonic motion with a mass-spring system. Track energy exchange between kinetic and potential in real time.",
    topics: ["Work & Energy"],
    params: ["Mass", "Spring constant k", "Damping coefficient"],
    color: "from-green-600 to-green-800",
    iconBg: "bg-green-700",
    icon: "🔄",
  },
  {
    slug: "inclined-plane",
    title: "Inclined Plane",
    description: "Analyze forces on a block sliding down a ramp. See normal force, friction, and weight components update as you adjust.",
    topics: ["Newton's Laws"],
    params: ["Ramp angle", "Block mass", "Friction coefficient μ"],
    color: "from-amber-600 to-amber-800",
    iconBg: "bg-amber-700",
    icon: "📐",
  },
  {
    slug: "pendulum",
    title: "Pendulum",
    description: "Swing a pendulum and watch energy convert between PE and KE. Explore the full nonlinear equation of motion beyond small angles.",
    topics: ["Rotational Motion", "Work & Energy"],
    params: ["String length", "Bob mass", "Initial angle", "Gravity"],
    color: "from-purple-600 to-purple-800",
    iconBg: "bg-purple-700",
    icon: "🕐",
  },
];

export default function SimulationsPage() {
  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Simulations</h1>
        <p className="text-muted-foreground mt-1">
          Interact with physics. Adjust parameters, predict outcomes, then verify.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {simulations.map((sim) => (
          <Link key={sim.slug} href={`/simulations/${sim.slug}`}>
            <Card className="h-full transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer overflow-hidden border-0">
              <div className={`bg-gradient-to-br ${sim.color} p-4 flex items-center gap-3`}>
                <div className={`${sim.iconBg} w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner`}>
                  {sim.icon}
                </div>
                <div>
                  <CardTitle className="text-white text-base">{sim.title}</CardTitle>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {sim.topics.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] bg-white/20 text-white border-0 hover:bg-white/30">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <CardContent className="pt-4 pb-5">
                <CardDescription className="text-xs mb-3 leading-relaxed">
                  {sim.description}
                </CardDescription>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Controls:</span>{" "}
                  {sim.params.join(" · ")}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
