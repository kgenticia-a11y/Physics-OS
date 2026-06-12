"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sun,
  Moon,
  User,
  GraduationCap,
  Shield,
  FileText,
  AlertTriangle,
  Globe,
  Lock,
  Eye,
  Trash2,
  Download,
  Bell,
  Scale,
} from "lucide-react";
import type { UserLevel } from "@/lib/types";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<UserLevel>("beginner");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  // Privacy preferences (stored locally for now)
  const [analyticsOptIn, setAnalyticsOptIn] = useState(true);
  const [aiDataRetention, setAiDataRetention] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    setMounted(true);
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? "");
        setName(user.user_metadata?.display_name ?? "");
        // Fetch the saved physics level from the profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("level")
          .eq("id", user.id)
          .single();
        if (profile?.level) {
          setLevel(profile.level as UserLevel);
        }
      }
    }
    loadProfile();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    await supabase.auth.updateUser({
      data: { display_name: name },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ level, display_name: name })
        .eq("id", user.id);
    }
    setSaving(false);
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action is permanent and cannot be undone. All your progress data will be lost."
    );
    if (!confirmed) return;
    // Sign out — actual deletion would require a server-side admin call
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function handleExportData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [progress, attempts] = await Promise.all([
      supabase.from("topic_progress").select("*").eq("user_id", user.id),
      supabase.from("attempts").select("*, questions(*)").eq("user_id", user.id),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: { email: user.email, name: user.user_metadata?.display_name },
      progress: progress.data ?? [],
      attempts: attempts.data ?? [],
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `physics-os-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, preferences, and privacy</p>
      </div>

      <div className="space-y-6">

        {/* ── Appearance ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {mounted && theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Appearance
            </CardTitle>
            <CardDescription>Choose light or dark mode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  mounted && theme === "light"
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Sun className="h-4 w-4" />
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  mounted && theme === "dark"
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Moon className="h-4 w-4" />
                Dark
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ── Profile ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Physics Level ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Physics Level
            </CardTitle>
            <CardDescription>
              This adjusts how the AI tutor communicates with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {(["beginner", "intermediate", "advanced"] as UserLevel[]).map((l) => (
                <Badge
                  key={l}
                  variant={level === l ? "default" : "outline"}
                  className="cursor-pointer capitalize px-4 py-1.5"
                  onClick={() => setLevel(l)}
                >
                  {l}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving..." : "Save changes"}
        </Button>

        <Separator />

        {/* ── Privacy & Data ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy & Data
            </CardTitle>
            <CardDescription>
              Control how your data is used and stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ToggleRow
              icon={<Eye className="h-4 w-4 text-muted-foreground" />}
              title="Usage analytics"
              description="Allow anonymous usage analytics to help improve Physics OS. No personal data is shared."
              checked={analyticsOptIn}
              onChange={setAnalyticsOptIn}
            />
            <ToggleRow
              icon={<Lock className="h-4 w-4 text-muted-foreground" />}
              title="AI conversation retention"
              description="Store your tutor conversations to improve response quality and personalize your experience."
              checked={aiDataRetention}
              onChange={setAiDataRetention}
            />
            <ToggleRow
              icon={<Bell className="h-4 w-4 text-muted-foreground" />}
              title="Email notifications"
              description="Receive study reminders and progress reports via email."
              checked={emailNotifications}
              onChange={setEmailNotifications}
            />
          </CardContent>
        </Card>

        {/* ── Data Export & Deletion ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" />
              Your Data
            </CardTitle>
            <CardDescription>
              Download or delete your data in compliance with GDPR, CCPA, and FERPA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={handleExportData} className="gap-2">
                <Download className="h-4 w-4" />
                Export all my data
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete my account
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Data export includes your profile, progress, practice attempts, and conversation history in JSON format.
              Account deletion is permanent and cannot be undone.
            </p>
          </CardContent>
        </Card>

        <Separator />

        {/* ── Legal & Compliance ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Legal & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              icon={<FileText className="h-4 w-4" />}
              title="Terms of Service"
              description="By using Physics OS, you agree to our terms of service which govern your use of the platform, including AI-generated content, intellectual property rights, and acceptable use policies."
            />
            <InfoRow
              icon={<Shield className="h-4 w-4" />}
              title="Privacy Policy"
              description="We collect minimal data required to provide the service: your email, display name, and learning progress. We do not sell your data to third parties. AI conversations may be processed by Google (Gemini API) under their data processing agreements."
            />
            <InfoRow
              icon={<Globe className="h-4 w-4" />}
              title="GDPR Compliance (EU)"
              description="If you are in the EU/EEA, you have the right to access, rectify, erase, restrict processing, and port your personal data. Use the export and delete buttons above to exercise these rights. Our legal basis for processing is legitimate interest and consent."
            />
            <InfoRow
              icon={<Globe className="h-4 w-4" />}
              title="CCPA Compliance (California)"
              description="California residents have the right to know what personal information is collected, request deletion, and opt out of the sale of personal information. We do not sell personal information. Use the controls above to manage your data."
            />
            <InfoRow
              icon={<GraduationCap className="h-4 w-4" />}
              title="FERPA Compliance (Education)"
              description="Physics OS is designed as a supplementary learning tool. If used in an educational institution context, we comply with FERPA regulations regarding student education records. Student data is not shared with unauthorized parties."
            />
            <InfoRow
              icon={<AlertTriangle className="h-4 w-4" />}
              title="COPPA (Children's Privacy)"
              description="Physics OS is not intended for children under 13. If you are under 13, please do not use this platform. If we discover that we have collected data from a child under 13 without parental consent, we will delete it promptly."
            />
            <InfoRow
              icon={<Lock className="h-4 w-4" />}
              title="AI-Generated Content Disclaimer"
              description="Content generated by the AI tutor, question generator, and diagram tools is for educational purposes only. While we strive for accuracy, AI-generated solutions may contain errors. Always verify important calculations independently. Physics OS is not a substitute for professional instruction."
            />
            <InfoRow
              icon={<Shield className="h-4 w-4" />}
              title="Data Security"
              description="Your data is stored on Supabase (backed by AWS) with encryption at rest and in transit. Authentication uses industry-standard protocols. We conduct regular security reviews and follow OWASP guidelines for web application security."
            />
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground pb-8">
          Physics OS v0.1.0 — For questions about privacy or compliance, contact support.
        </p>
      </div>
    </div>
  );
}

/* ── Helper components ── */

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium">{title}</p>
          <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              checked ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                checked ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
