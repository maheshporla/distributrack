import { Outlet } from "react-router-dom";
import { Package2, BarChart3, Boxes, Truck, ShieldCheck } from "lucide-react";
import { APP_NAME } from "@/constants/app.constants";

/**
 * Premium auth layout with stable two-column layout.
 *
 * Desktop: left branding panel is fixed at viewport height;
 * right form panel centers its content independently.
 * Switching registration roles does NOT shift the left panel.
 *
 * Mobile: branding + form stacked vertically.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel — hidden on small screens, fixed height on desktop */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-sidebar via-sidebar to-[hsl(222,47%,10%)] p-10 lg:flex lg:h-screen lg:shrink-0">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,hsl(174,60%,42%,0.08),transparent_60%)]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 shadow-lg shadow-sidebar-primary/25">
              <Package2 className="size-6 text-white" />
            </div>
            <div>
              <span className="block text-lg font-bold text-sidebar-foreground tracking-tight">
                {APP_NAME}
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40">
                Logistics Platform
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="max-w-md text-3xl font-bold leading-tight text-sidebar-foreground tracking-tight">
              Smart Distribution.
              <br />
              <span className="text-sidebar-primary">Simplified.</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-sidebar-foreground/60">
              Track stock across warehouses, dispatch delivery workers, and reconcile
              invoices — all from a single powerful dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Boxes, label: "Live Inventory", desc: "Real-time stock levels" },
              { icon: Truck, label: "Delivery Tracking", desc: "GPS-powered routes" },
              { icon: BarChart3, label: "Sales Analytics", desc: "Actionable insights" },
              { icon: ShieldCheck, label: "Secure Access", desc: "Role-based security" },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-xl border border-sidebar-border/50 bg-sidebar-accent/30 p-4 transition-colors hover:bg-sidebar-accent/50"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary/15">
                  <Icon className="size-4.5 text-sidebar-primary" />
                </div>
                <p className="mt-3 text-sm font-semibold text-sidebar-foreground/90">{label}</p>
                <p className="mt-0.5 text-xs text-sidebar-foreground/45">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-sidebar-foreground/30">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>

      {/* Form panel — centers content independently on desktop */}
      <div className="flex w-full flex-1 flex-col items-center justify-center p-6 lg:h-screen lg:overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile brand — shown only on small screens */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Package2 className="size-5 text-white" />
            </div>
            <div>
              <span className="block text-lg font-bold text-foreground">{APP_NAME}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Logistics Platform
              </span>
            </div>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
