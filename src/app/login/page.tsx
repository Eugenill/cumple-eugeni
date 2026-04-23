import { createSupabasePublicClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/LoginForm";

export const revalidate = 0;

export default async function LoginPage() {
  const supabase = createSupabasePublicClient();
  const { data: persones } = await supabase
    .from("persones")
    .select("id, nom")
    .order("nom");

  return <LoginForm persones={persones ?? []} />;
}
