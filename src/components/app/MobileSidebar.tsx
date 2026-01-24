"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupProgress } from "./SetupProgress";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";
import Image from "next/image";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64",
          "bg-white dark:bg-slate-950",
          "border-r border-slate-200 dark:border-slate-800",
          "flex flex-col",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-slate-200 dark:border-slate-800">
          <Image
            src="/favicon.svg"
            alt="Valyxo"
            height={32}
            width={128}
            priority
            className="h-8 w-auto select-none object-contain"
          />
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Setup Progress */}
        <div className="px-3 pt-4">
          <SetupProgress />
        </div>

        {/* Navigation */}
        <SidebarNav isCollapsed={false} />

        {/* Footer */}
        <div className="mt-auto border-t border-slate-200 dark:border-slate-800 p-3">
          <UserMenu />
        </div>
      </aside>
    </>
  );
}
