"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavGroup } from "./nav-config";

interface SidebarNavProps {
  isCollapsed: boolean;
}

export function SidebarNav({ isCollapsed }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href !== "/overview" && pathname.startsWith(href + "/")) return true;
    return false;
  };

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-4">
      <div className="space-y-6">
        {NAV_ITEMS.map((group) => (
          <NavGroup
            key={group.label}
            group={group}
            isActive={isActive}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
    </nav>
  );
}

function NavGroup({
  group,
  isActive,
  isCollapsed,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
  isCollapsed: boolean;
}) {
  return (
    <div>
      {!isCollapsed && (
        <div className="px-3 mb-2">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {group.label}
          </h3>
        </div>
      )}
      <div className="space-y-1">
        {group.items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={`${group.label}-${item.label}`}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg",
                "text-sm font-medium transition-colors",
                "relative group",
                active
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-50",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2B74FF] rounded-r-full" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  active
                    ? "text-[#2B74FF]"
                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400"
                )}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#2B74FF]/10 text-[#2B74FF]">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
