import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Dumbbell, Play, BarChart3, PenTool, Sparkles, ArrowRight } from "lucide-react";

const quickActions = [
  {
    href: "/tutor",
    title: "AI Tutor",
    description: "Ask questions and get guided through physics concepts with Socratic hints",
    icon: MessageCircle,
    gradient: "from-blue-500 to-blue-700",
    shadow: "shadow-blue-500/20",
    iconBg: "bg-blue-600",
  },
  {
    href: "/practice",
    title: "Practice",
    description: "Build intuition first, then solve computational problems",
    icon: Dumbbell,
    gradient: "from-green-500 to-emerald-700",
    shadow: "shadow-green-500/20",
    iconBg: "bg-green-600",
  },
  {
    href: "/diagrams",
    title: "Diagrams",
    description: "Generate free body diagrams, force diagrams, and visual explanations",
    icon: PenTool,
    gradient: "from-teal-500 to-teal-700",
    shadow: "shadow-teal-500/20",
    iconBg: "bg-teal-600",
  },
  {
    href: "/simulations",
    title: "Simulations",
    description: "Visualize physics with interactive simulations you can tweak",
    icon: Play,
    gradient: "from-purple-500 to-purple-700",
    shadow: "shadow-purple-500/20",
    iconBg: "bg-purple-600",
  },
  {
    href: "/progress",
    title: "Progress",
    description: "Track your mastery across mechanics topics and find weak spots",
    icon: BarChart3,
    gradient: "from-orange-500 to-amber-700",
    shadow: "shadow-orange-500/20",
    iconBg: "bg-orange-600",
  },
];

export default function DashboardPage() {
  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">AI-powered physics learning</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text">
          Welcome to Physics OS
        </h1>
        <p className="text-muted-foreground mt-3 text-lg max-w-xl">
          Build real physics intuition. We don&apos;t give you answers — we help you discover them.
        </p>
      </div>

      {/* Quick actions grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className={`group h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${action.shadow} cursor-pointer overflow-hidden border-0 bg-gradient-to-br ${action.gradient}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`${action.iconBg} w-10 h-10 rounded-xl flex items-center justify-center shadow-inner`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-white text-lg mt-3">{action.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/70 text-sm">
                  {action.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* How it works */}
      <Card className="card-glow overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">How Physics OS works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                step: "01",
                title: "Ask or practice",
                desc: "Start a conversation with the AI tutor or pick a topic to practice.",
                color: "text-blue-500",
              },
              {
                step: "02",
                title: "Build intuition first",
                desc: "Answer conceptual questions that test your understanding, not just formulas.",
                color: "text-green-500",
              },
              {
                step: "03",
                title: "Then solve",
                desc: "Once you understand the concepts, unlock computational problems.",
                color: "text-purple-500",
              },
              {
                step: "04",
                title: "Track and improve",
                desc: "See your progress, identify weaknesses, and keep pushing your understanding.",
                color: "text-orange-500",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <span className={`text-2xl font-bold ${item.color} opacity-60`}>{item.step}</span>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-center">
        <Link href="/practice">
          <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
            <Dumbbell className="h-4 w-4" />
            Start practicing
          </Button>
        </Link>
      </div>
    </div>
  );
}
