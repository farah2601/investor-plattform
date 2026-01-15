import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
};

export function KpiCard({ label, value, sublabel }: KpiCardProps) {
  return (
    <Card className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-6 transition-all duration-300 ease-out hover:bg-slate-800/60 hover:border-slate-600/50 hover:shadow-xl hover:shadow-[#2B74FF]/10 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer group">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-xs font-medium text-slate-500 tracking-[0.18em] uppercase transition-colors duration-300 group-hover:text-slate-400">
          {label}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-1">
        <p className="text-2xl font-semibold text-white transition-transform duration-300 group-hover:scale-105">{value}</p>
        {sublabel && (
          <p className="text-xs text-slate-400 mt-1 transition-colors duration-300 group-hover:text-slate-300">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  );
}