import { NavLink } from "react-router-dom";
import { Package2 } from "lucide-react";
import { NAV_SECTIONS } from "@/components/layout/nav-config";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/constants/app.constants";

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Premium sidebar navigation with dark chrome aesthetic.
 * Shared between desktop Sidebar and mobile Sheet drawer.
 */
export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const role = useAuthStore((state) => state.user?.role);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || (role && item.roles.includes(role)),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center gap-3 px-4 border-b border-sidebar-border",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 shadow-lg shadow-sidebar-primary/20">
          <Package2 className="size-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="block truncate text-[15px] font-bold tracking-tight text-sidebar-foreground">
              {APP_NAME}
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">
              Logistics Platform
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {visibleSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/35">
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
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                        "text-sidebar-foreground/65",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-2",
                        isActive && [
                          "bg-sidebar-accent text-sidebar-accent-foreground",
                          "shadow-sm shadow-sidebar-accent/50",
                        ],
                      )
                    }
                  >
                    <item.icon
                      className={cn(
                        "size-[18px] shrink-0 transition-colors",
                        "group-hover:text-sidebar-accent-foreground",
                      )}
                      aria-hidden="true"
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="ml-auto rounded-full bg-sidebar-primary/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
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
