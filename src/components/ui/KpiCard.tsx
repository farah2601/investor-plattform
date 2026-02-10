import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Info } from "lucide-react";

type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  onDetailsClick?: () => void;
};

export function KpiCard({ label, value, sublabel, onDetailsClick }: KpiCardProps) {
  return (
    <Card className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-6 transition-all duration-300 ease-out hover:bg-slate-800/60 hover:border-slate-600/50 hover:shadow-xl hover:shadow-[#2B74FF]/10 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer group light:bg-white light:border-slate-200 light:hover:border-slate-300 light:hover:shadow-md relative">
      <CardHeader className="p-0 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xs font-medium text-slate-500 tracking-[0.18em] uppercase transition-colors duration-300 group-hover:text-slate-400 light:text-slate-600 light:group-hover:text-slate-700">
            {label}
          </CardTitle>
          {onDetailsClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDetailsClick();
              }}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 -m-1"
              title="View details"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-1">
        <p className="text-2xl font-semibold text-white transition-transform duration-300 group-hover:scale-105 light:text-slate-950">{value}</p>
        {sublabel && (
          <p className="text-xs text-slate-400 mt-1 transition-colors duration-300 group-hover:text-slate-300 light:text-slate-600 light:group-hover:text-slate-700">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  );
}