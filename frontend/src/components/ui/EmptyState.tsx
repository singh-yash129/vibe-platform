import { ArrowRight } from "lucide-react";
import type { EmptyStateProps } from "@/types/ui.types";

export const EmptyState = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  variant = "default",
  className,
}: EmptyStateProps) => {
  const isError = variant === "error";

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border py-14 px-8 text-center overflow-hidden ${
        isError
          ? "border-destructive/20 bg-destructive/5"
          : "border-border bg-card"
      } ${className || ""}`}
    >
      {/* Animated gradient blob behind everything */}
      {!isError && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30"
        >
          <div
            className="h-64 w-64 rounded-full blur-3xl animate-float-slow"
            style={{
              background:
                "radial-gradient(circle, hsl(262 83% 65% / 0.35) 0%, hsl(38 95% 58% / 0.15) 60%, transparent 100%)",
            }}
          />
        </div>
      )}

      {/* Icon */}
      <div
        className={`relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl animate-float ${
          isError
            ? "bg-destructive/10 text-destructive"
            : "bg-gradient-to-br from-violet-500/20 to-amber-400/10 text-muted-foreground"
        }`}
        style={{ boxShadow: isError ? undefined : "0 0 24px hsl(262 83% 65% / 0.15)" }}
      >
        {icon ?? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        )}
      </div>

      {/* Text */}
      <h3
        className={`relative z-10 mb-2 text-lg font-bold tracking-tight ${
          isError ? "text-destructive" : "text-foreground"
        }`}
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {title}
      </h3>
      <p className="relative z-10 mb-6 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {/* CTA */}
      {onAction && actionText && (
        <button
          onClick={onAction}
          className={`relative z-10 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
            isError
              ? "border border-destructive/30 text-destructive hover:bg-destructive/10"
              : "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg hover:shadow-violet-500/25"
          }`}
        >
          {actionText}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

