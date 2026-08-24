import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

/**
 * Premium fixed sidebar for desktop. Deep navy chrome with subtle border.
 * Collapses to icon-only rail; state persisted via useUiStore.
 */
export function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out md:flex md:flex-col",
        isSidebarCollapsed ? "w-[68px]" : "w-[260px]",
      )}
    >
      <div className="min-h-0 flex-1">
        <SidebarNav collapsed={isSidebarCollapsed} />
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors",
            "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            isSidebarCollapsed && "justify-center px-2",
          )}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose className="size-4" aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
