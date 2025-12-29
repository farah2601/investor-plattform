import { supabase } from "../../db/supabase";

export async function getAgentLogs(input: any) {
  const { companyId } = input;

  if (!companyId) {
    throw new Error("Missing companyId");
  }

  const { data, error } = await supabase
    .from("agent_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return {
    ok: true,
    logs: data ?? [],
  };
}