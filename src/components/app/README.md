# App Shell Components

Production-ready left sidebar navigation component for the Valyxo app.

## Components

- **AppShell.tsx** - Main wrapper component with sidebar + content area
- **Sidebar.tsx** - Desktop fixed sidebar (collapsible)
- **MobileSidebar.tsx** - Mobile slide-in drawer
- **SidebarNav.tsx** - Navigation items with active states
- **SetupProgress.tsx** - Setup completion progress bar
- **UserMenu.tsx** - User profile menu with logout
- **nav-config.tsx** - Navigation configuration

## Usage

### Option 1: Update existing (app) layout

Update `src/app/(app)/layout.tsx`:

```tsx
"use client";

import { AppShell } from "@/components/app/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

Ensure `UserCompanyProvider` wraps the app (e.g. in root layout via `Providers`).

### Option 2: Use in specific pages

Wrap individual pages that need the sidebar:

```tsx
import { AppShell } from "@/components/app/AppShell";

export default function MyPage() {
  return (
    <AppShell>
      <div>Your page content</div>
    </AppShell>
  );
}
```

## Features

- ✅ Fixed left sidebar (desktop) - 256px wide, collapsible to 64px
- ✅ Slide-in drawer (mobile) - full height overlay
- ✅ Setup completion progress bar (dismissible)
- ✅ Grouped navigation sections
- ✅ Active route highlighting
- ✅ User menu with logout
- ✅ Dark/light mode support
- ✅ Keyboard accessible
- ✅ Single company per user (no company switching)

## Navigation Groups

- **Core**: Overview, Dashboard
- **Reporting**: Investor Updates, Reports
- **Fundraising**: Pipeline, Decks, Data Room
- **Data**: Connected Systems
- **Settings**: Company Settings

## Customization

Edit `nav-config.tsx` to modify navigation items, groups, or add badges.
