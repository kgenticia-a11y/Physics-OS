export interface ConceptNode {
  id: string;
  name: string;
  topic: string;
  description: string;
  prerequisites: string[];
  subtopicKeys: string[];
  x?: number;
  y?: number;
}

export interface ConceptEdge {
  from: string;
  to: string;
}

export interface MasteryOverlay {
  nodeId: string;
  mastery: number; // 0-1
  attempts: number;
  lastStudied: string | null;
}

export type MasteryLevel = "not-started" | "weak" | "developing" | "strong" | "mastered";

export function getMasteryLevel(mastery: number, attempts: number): MasteryLevel {
  if (attempts === 0) return "not-started";
  if (mastery < 0.4) return "weak";
  if (mastery < 0.6) return "developing";
  if (mastery < 0.8) return "strong";
  return "mastered";
}

export const MASTERY_COLORS: Record<MasteryLevel, string> = {
  "not-started": "#64748b",
  "weak": "#ef4444",
  "developing": "#f59e0b",
  "strong": "#22c55e",
  "mastered": "#6366f1",
};

export const CONCEPT_NODES: ConceptNode[] = [
  // Foundational (Layer 0)
  {
    id: "vectors",
    name: "Vectors",
    topic: "kinematics",
    description: "Vector addition, components, and direction",
    prerequisites: [],
    subtopicKeys: [],
  },
  {
    id: "units-dimensions",
    name: "Units & Dimensions",
    topic: "kinematics",
    description: "SI units, dimensional analysis, unit conversion",
    prerequisites: [],
    subtopicKeys: [],
  },

  // Kinematics (Layer 1)
  {
    id: "displacement-velocity",
    name: "Displacement & Velocity",
    topic: "kinematics",
    description: "Position, displacement, average and instantaneous velocity",
    prerequisites: ["vectors", "units-dimensions"],
    subtopicKeys: ["Displacement and distance", "Velocity and speed"],
  },
  {
    id: "acceleration",
    name: "Acceleration",
    topic: "kinematics",
    description: "Rate of change of velocity, constant acceleration",
    prerequisites: ["displacement-velocity"],
    subtopicKeys: ["Acceleration"],
  },
  {
    id: "equations-of-motion",
    name: "Equations of Motion",
    topic: "kinematics",
    description: "The 4 kinematic equations for constant acceleration",
    prerequisites: ["acceleration"],
    subtopicKeys: ["Equations of motion"],
  },
  {
    id: "projectile-motion",
    name: "Projectile Motion",
    topic: "kinematics",
    description: "2D motion under gravity with horizontal and vertical components",
    prerequisites: ["equations-of-motion", "vectors"],
    subtopicKeys: ["Projectile motion"],
  },
  {
    id: "relative-motion",
    name: "Relative Motion",
    topic: "kinematics",
    description: "Motion in different reference frames",
    prerequisites: ["displacement-velocity", "vectors"],
    subtopicKeys: ["Relative motion"],
  },

  // Newton's Laws (Layer 2)
  {
    id: "newtons-first-law",
    name: "Newton's 1st Law",
    topic: "newtons-laws",
    description: "Inertia — objects remain at rest or constant velocity unless acted upon",
    prerequisites: ["displacement-velocity"],
    subtopicKeys: ["Newton's First Law (Inertia)"],
  },
  {
    id: "newtons-second-law",
    name: "Newton's 2nd Law",
    topic: "newtons-laws",
    description: "F = ma — net force causes acceleration",
    prerequisites: ["acceleration", "newtons-first-law"],
    subtopicKeys: ["Newton's Second Law (F=ma)"],
  },
  {
    id: "newtons-third-law",
    name: "Newton's 3rd Law",
    topic: "newtons-laws",
    description: "Action-reaction pairs — equal and opposite forces",
    prerequisites: ["newtons-second-law"],
    subtopicKeys: ["Newton's Third Law (Action-Reaction)"],
  },
  {
    id: "free-body-diagrams",
    name: "Free Body Diagrams",
    topic: "newtons-laws",
    description: "Visual representation of all forces on an object",
    prerequisites: ["newtons-second-law", "vectors"],
    subtopicKeys: ["Free body diagrams"],
  },
  {
    id: "friction",
    name: "Friction",
    topic: "newtons-laws",
    description: "Static and kinetic friction forces",
    prerequisites: ["free-body-diagrams"],
    subtopicKeys: ["Friction (static and kinetic)"],
  },
  {
    id: "inclined-planes",
    name: "Inclined Planes",
    topic: "newtons-laws",
    description: "Forces on objects on sloped surfaces",
    prerequisites: ["friction", "free-body-diagrams"],
    subtopicKeys: ["Inclined planes"],
  },
  {
    id: "tension-pulleys",
    name: "Tension & Pulleys",
    topic: "newtons-laws",
    description: "Tension forces and pulley systems (Atwood machines)",
    prerequisites: ["free-body-diagrams", "newtons-third-law"],
    subtopicKeys: ["Tension and pulleys"],
  },

  // Work & Energy (Layer 3)
  {
    id: "work",
    name: "Work",
    topic: "work-energy",
    description: "Work done by a force: W = F·d·cos(θ)",
    prerequisites: ["newtons-second-law", "vectors"],
    subtopicKeys: ["Work done by a force"],
  },
  {
    id: "kinetic-energy",
    name: "Kinetic Energy",
    topic: "work-energy",
    description: "Energy of motion: KE = ½mv²",
    prerequisites: ["work"],
    subtopicKeys: ["Kinetic energy"],
  },
  {
    id: "potential-energy",
    name: "Potential Energy",
    topic: "work-energy",
    description: "Gravitational PE = mgh, Elastic PE = ½kx²",
    prerequisites: ["work"],
    subtopicKeys: ["Potential energy (gravitational and elastic)"],
  },
  {
    id: "work-energy-theorem",
    name: "Work-Energy Theorem",
    topic: "work-energy",
    description: "Net work equals change in kinetic energy",
    prerequisites: ["kinetic-energy"],
    subtopicKeys: ["Work-energy theorem"],
  },
  {
    id: "conservation-of-energy",
    name: "Conservation of Energy",
    topic: "work-energy",
    description: "Total mechanical energy is conserved in absence of non-conservative forces",
    prerequisites: ["kinetic-energy", "potential-energy"],
    subtopicKeys: ["Conservation of energy"],
  },
  {
    id: "power",
    name: "Power",
    topic: "work-energy",
    description: "Rate of doing work: P = W/t",
    prerequisites: ["work"],
    subtopicKeys: ["Power"],
  },

  // Momentum (Layer 4)
  {
    id: "linear-momentum",
    name: "Linear Momentum",
    topic: "momentum",
    description: "p = mv — quantity of motion",
    prerequisites: ["newtons-second-law"],
    subtopicKeys: ["Linear momentum"],
  },
  {
    id: "impulse",
    name: "Impulse",
    topic: "momentum",
    description: "J = FΔt = Δp — change in momentum",
    prerequisites: ["linear-momentum"],
    subtopicKeys: ["Impulse"],
  },
  {
    id: "conservation-of-momentum",
    name: "Conservation of Momentum",
    topic: "momentum",
    description: "Total momentum is conserved in isolated systems",
    prerequisites: ["linear-momentum", "newtons-third-law"],
    subtopicKeys: ["Conservation of momentum"],
  },
  {
    id: "elastic-collisions",
    name: "Elastic Collisions",
    topic: "momentum",
    description: "Collisions where kinetic energy is conserved",
    prerequisites: ["conservation-of-momentum", "conservation-of-energy"],
    subtopicKeys: ["Elastic collisions"],
  },
  {
    id: "inelastic-collisions",
    name: "Inelastic Collisions",
    topic: "momentum",
    description: "Collisions where kinetic energy is NOT conserved",
    prerequisites: ["conservation-of-momentum"],
    subtopicKeys: ["Inelastic collisions"],
  },
  {
    id: "center-of-mass",
    name: "Center of Mass",
    topic: "momentum",
    description: "Average position weighted by mass",
    prerequisites: ["linear-momentum"],
    subtopicKeys: ["Center of mass"],
  },

  // Rotational Motion (Layer 5)
  {
    id: "angular-displacement-velocity",
    name: "Angular Velocity",
    topic: "rotational-motion",
    description: "Angular displacement, angular velocity (ω)",
    prerequisites: ["displacement-velocity"],
    subtopicKeys: ["Angular displacement and velocity"],
  },
  {
    id: "angular-acceleration",
    name: "Angular Acceleration",
    topic: "rotational-motion",
    description: "Rate of change of angular velocity (α)",
    prerequisites: ["angular-displacement-velocity", "acceleration"],
    subtopicKeys: ["Angular acceleration"],
  },
  {
    id: "torque",
    name: "Torque",
    topic: "rotational-motion",
    description: "τ = r × F — rotational analog of force",
    prerequisites: ["angular-acceleration", "newtons-second-law"],
    subtopicKeys: ["Torque"],
  },
  {
    id: "moment-of-inertia",
    name: "Moment of Inertia",
    topic: "rotational-motion",
    description: "Rotational analog of mass — resistance to angular acceleration",
    prerequisites: ["torque"],
    subtopicKeys: ["Moment of inertia"],
  },
  {
    id: "rotational-kinetic-energy",
    name: "Rotational KE",
    topic: "rotational-motion",
    description: "KE_rot = ½Iω² — kinetic energy of rotation",
    prerequisites: ["moment-of-inertia", "kinetic-energy"],
    subtopicKeys: ["Rotational kinetic energy"],
  },
  {
    id: "angular-momentum",
    name: "Angular Momentum",
    topic: "rotational-motion",
    description: "L = Iω — rotational analog of linear momentum",
    prerequisites: ["moment-of-inertia", "linear-momentum"],
    subtopicKeys: ["Angular momentum"],
  },
];

export function buildEdges(): ConceptEdge[] {
  const edges: ConceptEdge[] = [];
  for (const node of CONCEPT_NODES) {
    for (const prereq of node.prerequisites) {
      edges.push({ from: prereq, to: node.id });
    }
  }
  return edges;
}

export function getNodeById(id: string): ConceptNode | undefined {
  return CONCEPT_NODES.find((n) => n.id === id);
}

export function getPrerequisiteChain(nodeId: string): string[] {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = getNodeById(current);
    if (!node) continue;
    for (const prereq of node.prerequisites) {
      if (!visited.has(prereq)) {
        visited.add(prereq);
        queue.push(prereq);
      }
    }
  }
  return Array.from(visited);
}

export function getDependents(nodeId: string): string[] {
  return CONCEPT_NODES
    .filter((n) => n.prerequisites.includes(nodeId))
    .map((n) => n.id);
}
