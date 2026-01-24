import {
  LayoutDashboard,
  Plug,
  Settings,
  Home,
  Building2,
  UserPlus,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_ITEMS: NavGroup[] = [
  {
    label: "Core",
    items: [
      { label: "Overview", href: "/overview", icon: Home },
      { label: "Dashboard", href: "/company-dashboard", icon: LayoutDashboard },
      { label: "Company Profile", href: "/company-profile", icon: Building2 },
    ],
  },
  {
    label: "Data",
    items: [
      { label: "Investor Requests", href: "/overview/investor-requests", icon: UserPlus },
      { label: "Connected Systems", href: "/overview/connected-systems", icon: Plug },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Company Settings", href: "/company-settings", icon: Settings },
    ],
  },
];

export function getPageTitle(pathname: string): string {
  for (const group of NAV_ITEMS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        return item.label;
      }
    }
  }
  return "Dashboard";
}
