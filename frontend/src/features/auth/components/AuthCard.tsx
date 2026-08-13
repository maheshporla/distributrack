import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** Rendered below a separator — typically a "Don't have an account? ..." link. */
  footer?: ReactNode;
}

/**
 * Shared shell for every auth page (Login, Register, ...): a centered,
 * width-constrained card with a title/description header and an
 * optional footer link. Purely presentational — owns no form state and
 * imports no auth hooks; pages supply their own form as `children`.
 */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="flex w-full items-center justify-center">
      <Card className="w-full max-w-[440px]">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>

        <CardContent>{children}</CardContent>

        {footer && (
          <CardFooter className="justify-center border-t border-border pt-6 text-center">
            {footer}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
