"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAgentEvent = logAgentEvent;
const supabase_1 = require("../db/supabase");
async function logAgentEvent(companyId, toolName, status, message, meta = {}) {
    // ✅ Viktig: success må ALLTID være boolean hvis kolonnen er NOT NULL
    const success = status !== "fail"; // true for success/info/start, false for fail
    const errorText = status === "fail" ? message : null;
    const payload = {
        // NYTT (du sa disse finnes i agent_logs)
        company_id: companyId,
        tool_name: toolName,
        status,
        message,
        meta,
        // LEGACY (så gamle constraints ikke kræsjer)
        run_type: "mcp",
        success,
        error: errorText,
    };
    const { error } = await supabase_1.supabase.from("agent_logs").insert(payload);
    if (error) {
        console.error("❌ Failed to log agent event", error);
        throw error;
    }
}
