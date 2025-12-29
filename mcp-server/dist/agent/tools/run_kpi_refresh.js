"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKpiRefresh = runKpiRefresh;
const zod_1 = require("zod");
const InputSchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid(),
});
async function runKpiRefresh(input) {
    const parsed = InputSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error("Invalid input for run_kpi_refresh");
    }
    const { companyId } = parsed.data;
    // 🧠 Her kommer ekte KPI-jobb senere
    const result = {
        refreshedAt: new Date().toISOString(),
        kpis: {
            revenue: 123,
            mrr: 45,
            churn: 0.02,
        },
    };
    return {
        ok: true,
        companyId,
        result,
    };
}
