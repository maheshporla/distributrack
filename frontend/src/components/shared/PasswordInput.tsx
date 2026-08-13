import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * `PasswordInput` owns its own `type` toggling internally, so it isn't
 * exposed as a prop — a caller overriding it would defeat the component.
 */
export type PasswordInputProps = Omit<InputProps, "type">;

/**
 * A password `<Input>` with a show/hide toggle.
 *
 * Purely presentational: it holds only the local visibility flag and
 * forwards everything else (value, onChange, ref, validation state, ...)
 * straight through, so it works as a drop-in replacement for `Input`
 * inside a react-hook-form `register(...)` call.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={isVisible ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? "Hide password" : "Show password"}
          className={cn(
            "absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm",
            "text-muted-foreground transition-colors hover:text-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          )}
        >
          {isVisible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
