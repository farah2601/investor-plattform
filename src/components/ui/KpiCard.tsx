import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
};

export function KpiCard({ label, value, sublabel }: KpiCardProps) {
  return (
    <Card className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-6 transition hover:bg-slate-800/50 hover:shadow-lg hover:shadow-black/20">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-xs font-medium text-slate-500 tracking-[0.18em] uppercase">
          {label}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-1">
        <p className="text-2xl font-semibold text-white">{value}</p>
        {sublabel && (
          <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  );
}