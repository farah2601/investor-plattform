"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings, User, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/app/lib/supabaseClient";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>("U");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || null);
        const name = session.user.user_metadata?.full_name || session.user.email || "User";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        setUserInitials(initials);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
          "hover:bg-slate-50 dark:hover:bg-slate-800",
          "transition-colors text-left"
        )}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-[#2B74FF] text-white text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
            {userEmail?.split("@")[0] || "User"}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {userEmail || ""}
          </div>
        </div>
        <ChevronUp
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute bottom-full left-0 right-0 mb-2 z-50",
            "bg-white dark:bg-slate-900",
            "border border-slate-200 dark:border-slate-700",
            "rounded-lg shadow-lg",
            "overflow-hidden"
          )}
        >
          <div className="py-1">
            <Link
              href="/company-settings"
              className={cn(
                "flex items-center gap-3 px-3 py-2",
                "text-sm text-slate-700 dark:text-slate-300",
                "hover:bg-slate-50 dark:hover:bg-slate-800",
                "transition-colors"
              )}
              onClick={() => setIsOpen(false)}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2",
                "text-sm text-red-600 dark:text-red-400",
                "hover:bg-slate-50 dark:hover:bg-slate-800",
                "transition-colors text-left"
              )}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
