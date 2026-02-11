import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import {
  Info,
  Wallet,
  Flame,
  Clock,
  UserMinus,
  Calendar,
  CircleDollarSign,
  Users,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

const METRIC_ICONS: Record<string, LucideIcon> = {
  cash_balance: Wallet,
  burn_rate: Flame,
  runway_months: Clock,
  churn: UserMinus,
  mrr: Calendar,
  arr: CircleDollarSign,
  customers: Users,
  net_revenue: DollarSign,
};

type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  onDetailsClick?: () => void;
  /** Metric key for icon (e.g. "mrr", "arr", "burn_rate"). Optional. */
  metricKey?: string;
};

export function KpiCard({ label, value, sublabel, onDetailsClick, metricKey }: KpiCardProps) {
  const Icon = metricKey ? METRIC_ICONS[metricKey] : null;

  return (
    <Card className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-5 transition-all duration-200 ease-out hover:bg-slate-800/70 hover:border-slate-600/50 hover:shadow-lg hover:shadow-slate-900/30 cursor-pointer group light:bg-white light:border-slate-200 light:hover:border-slate-300 light:hover:shadow-md relative overflow-hidden before:absolute before:inset-0 before:rounded-lg before:content-[''] before:border-t before:border-slate-500/20 before:pointer-events-none">
      <CardHeader className="p-0 pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <span className="flex-shrink-0 text-slate-500 group-hover:text-slate-400 light:text-slate-600 light:group-hover:text-slate-500">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <CardTitle className="text-xs font-medium text-slate-500 tracking-widest uppercase transition-colors duration-200 group-hover:text-slate-400 light:text-slate-600 light:group-hover:text-slate-700 truncate">
              {label}
            </CardTitle>
          </div>
          {onDetailsClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDetailsClick();
              }}
              className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 -m-0.5 rounded flex-shrink-0"
              title="View details"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-1">
        <p className="text-[1.35rem] font-semibold text-white tracking-tight light:text-slate-950 tabular-nums">{value}</p>
        {sublabel ? (
          <p className="text-xs leading-snug text-slate-400 transition-colors duration-200 group-hover:text-slate-300 light:text-slate-600 light:group-hover:text-slate-700 line-clamp-2">{sublabel}</p>
        ) : (
          <span className="block h-4" aria-hidden />
        )}
      </CardContent>
    </Card>
  );
}