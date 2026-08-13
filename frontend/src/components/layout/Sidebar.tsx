import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

/**
 * Fixed, always-visible sidebar for desktop viewports (md and up).
 * Collapses to an icon-only rail; state is persisted via useUiStore.
 * On mobile this is replaced entirely by the Sheet drawer rendered
 * from Navbar, so it's hidden below the `md` breakpoint.
 */
export function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex md:flex-col",
        isSidebarCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="min-h-0 flex-1">
        <SidebarNav collapsed={isSidebarCollapsed} />
      </div>

      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(
          "flex h-12 items-center gap-2 border-t border-sidebar-border px-4 text-xs font-medium",
          "text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isSidebarCollapsed && "justify-center px-2",
        )}
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isSidebarCollapsed ? (
          <PanelLeftOpen className="size-4.5" aria-hidden="true" />
        ) : (
          <>
            <PanelLeftClose className="size-4.5" aria-hidden="true" />
            Collapse
          </>
        )}
      </button>
    </aside>
  );
}
