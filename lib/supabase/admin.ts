import "server-only";
import { createClient } from "@supabase/supabase-js";

// Lazily created so the module can be imported even when
// SUPABASE_SERVICE_ROLE_KEY is absent (e.g. local dev without key).
// The route handler guards against the missing key before calling getAdmin().
let _admin: ReturnType<typeof createClient> | null = null;

export function getAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _admin;
}
