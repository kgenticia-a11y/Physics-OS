import { Topic } from "@/lib/types";

export const MECHANICS_TOPICS: Topic[] = [
  {
    slug: "kinematics",
    name: "Kinematics",
    description: "Motion, velocity, acceleration, and projectile motion",
    icon: "🏃",
    subtopics: [
      "Displacement and distance",
      "Velocity and speed",
      "Acceleration",
      "Equations of motion",
      "Projectile motion",
      "Relative motion",
    ],
  },
  {
    slug: "newtons-laws",
    name: "Newton's Laws",
    description: "Forces, free body diagrams, and Newton's three laws",
    icon: "⚖️",
    subtopics: [
      "Newton's First Law (Inertia)",
      "Newton's Second Law (F=ma)",
      "Newton's Third Law (Action-Reaction)",
      "Free body diagrams",
      "Friction (static and kinetic)",
      "Inclined planes",
      "Tension and pulleys",
    ],
  },
  {
    slug: "work-energy",
    name: "Work & Energy",
    description: "Work, kinetic energy, potential energy, and conservation",
    icon: "⚡",
    subtopics: [
      "Work done by a force",
      "Kinetic energy",
      "Potential energy (gravitational and elastic)",
      "Conservation of energy",
      "Power",
      "Work-energy theorem",
    ],
  },
  {
    slug: "momentum",
    name: "Momentum",
    description: "Linear momentum, impulse, and collisions",
    icon: "💥",
    subtopics: [
      "Linear momentum",
      "Impulse",
      "Conservation of momentum",
      "Elastic collisions",
      "Inelastic collisions",
      "Center of mass",
    ],
  },
  {
    slug: "rotational-motion",
    name: "Rotational Motion",
    description: "Angular velocity, torque, and moment of inertia",
    icon: "🔄",
    subtopics: [
      "Angular displacement and velocity",
      "Angular acceleration",
      "Torque",
      "Moment of inertia",
      "Rotational kinetic energy",
      "Angular momentum",
    ],
  },
];

export function getTopicBySlug(slug: string): Topic | undefined {
  return MECHANICS_TOPICS.find((t) => t.slug === slug);
}
