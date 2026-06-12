"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  Dumbbell,
  Play,
  BarChart3,
  Settings,
  LogOut,
  Atom,
  PenTool,
  Network,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/tutor", label: "Tutor", icon: MessageCircle, activeColor: "bg-blue-600", hoverIcon: "group-hover:text-blue-400" },
  { href: "/practice", label: "Practice", icon: Dumbbell, activeColor: "bg-green-600", hoverIcon: "group-hover:text-green-400" },
  { href: "/diagrams", label: "Diagrams", icon: PenTool, activeColor: "bg-teal-600", hoverIcon: "group-hover:text-teal-400" },
  { href: "/simulations", label: "Simulations", icon: Play, activeColor: "bg-purple-600", hoverIcon: "group-hover:text-purple-400" },
  { href: "/knowledge-graph", label: "Knowledge Graph", icon: Network, activeColor: "bg-cyan-600", hoverIcon: "group-hover:text-cyan-400" },
  { href: "/progress", label: "Progress", icon: BarChart3, activeColor: "bg-orange-600", hoverIcon: "group-hover:text-orange-400" },
  { href: "/settings", label: "Settings", icon: Settings, activeColor: "bg-gray-600", hoverIcon: "group-hover:text-gray-400" },
];

export function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Atom className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 dark:text-white">Physics OS</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">Build your intuition</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? `${item.activeColor} text-white shadow-lg`
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-white" : item.hoverIcon)} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 pb-10 border-t border-slate-200 dark:border-slate-800">
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-all"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
