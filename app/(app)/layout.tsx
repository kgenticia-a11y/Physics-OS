import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import Image from "next/image";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar — high z-index so it's always clickable */}
      <div style={{ position: "relative", zIndex: 40 }}>
        <Sidebar />
      </div>

      <main className="md:pl-64 pb-20 md:pb-0 min-h-screen relative">
        {/* Background blobs — behind content, only in main area */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/3 -left-20 w-80 h-80 bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-3xl animate-blob-delay-1" />
          <div className="absolute -bottom-20 right-1/4 w-[500px] h-[500px] bg-teal-300/8 dark:bg-teal-500/5 rounded-full blur-3xl animate-blob-delay-2" />
          <div
            className="w-full h-full opacity-30 dark:opacity-15"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.06) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        {/* Einstein — top right */}
        <div style={{ position: "fixed", top: 16, right: 20, zIndex: 50 }}>
          <Image
            src="/einstein.png"
            alt="Einstein"
            width={72}
            height={72}
            className="rounded-full shadow-xl border-2 border-white dark:border-neutral-700 hover:scale-110 hover:rotate-6 transition-all duration-300 cursor-pointer"
          />
        </div>

        {/* Page content */}
        <div className="relative" style={{ zIndex: 1 }}>
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
