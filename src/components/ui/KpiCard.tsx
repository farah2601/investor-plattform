import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
};

export function KpiCard({ label, value, sublabel }: KpiCardProps) {
  return (
    <Card className="bg-[#13171E] border border-white/10 rounded-xl p-6 transition hover:bg-[#1B2029] hover:shadow-lg hover:shadow-black/30">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-xs font-medium text-slate-400 tracking-[0.18em] uppercase">
          {label}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-1">
        <p className="text-2xl font-semibold text-slate-50">{value}</p>
        {sublabel && (
          <p className="text-xs text-emerald-400 mt-1">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  );
}