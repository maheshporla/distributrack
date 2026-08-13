import { NavLink } from "react-router-dom";
import { Package2 } from "lucide-react";
import { NAV_SECTIONS } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/constants/app.constants";

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Renders the brand mark + grouped nav links. Shared between the
 * always-visible desktop Sidebar and the mobile Sheet drawer so the
 * two never drift out of sync.
 */
export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 items-center gap-2 px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <Package2 className="size-4.5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-sidebar-foreground">
            {APP_NAME}
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-3 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/"}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                        "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-2",
                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                      )
                    }
                  >
                    <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="ml-auto rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
