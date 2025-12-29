"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentLogs = getAgentLogs;
const supabase_1 = require("../../db/supabase");
async function getAgentLogs(input) {
    const { companyId } = input;
    if (!companyId) {
        throw new Error("Missing companyId");
    }
    const { data, error } = await supabase_1.supabase
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
