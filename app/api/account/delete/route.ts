import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";

export async function POST() {
  // Guard: admin client requires SUPABASE_SERVICE_ROLE_KEY
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY not set — account deletion unavailable");
    return Response.json(
      { error: "Account deletion is not configured on this deployment. Contact support." },
      { status: 503 }
    );
  }

  // Verify the requesting user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete the user from Supabase Auth.
  // All linked data (profiles, questions, attempts, topic_progress) is
  // removed automatically via ON DELETE CASCADE in the migration schema.
  try {
    const admin = getAdmin();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("Account deletion error:", error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Admin client error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }

  return Response.json({ success: true });
}
