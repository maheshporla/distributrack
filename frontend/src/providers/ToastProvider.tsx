import { Toaster } from "sonner";
import { useTheme } from "next-themes";

/**
 * Renders the global toast viewport once at the app root.
 * Feature code triggers toasts by importing `toast` from "sonner"
 * directly (e.g. `toast.success("Product created")`) — no custom
 * wrapper needed, this component only mounts the viewport + styling.
 */
export function ToastProvider() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-border shadow-lg",
        },
      }}
    />
  );
}
