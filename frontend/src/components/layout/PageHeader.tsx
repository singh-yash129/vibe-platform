import type { ReactNode } from "react";
import { cn } from "@/utils/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned controls (e.g. a refresh button, view toggles). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared page heading — Syne display font title, gradient left accent,
 * subtle slide-in entrance. Keep page-specific markup in `actions`.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-slide-up-fade",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {/* Gradient left accent bar */}
        <div
          className="mt-0.5 hidden sm:block shrink-0 w-1 self-stretch rounded-full"
          style={{ background: "linear-gradient(to bottom, hsl(38 95% 58%), hsl(262 83% 70%))" }}
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h1
            className="text-xl font-bold tracking-tight text-foreground md:text-2xl"
            style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
