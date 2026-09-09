import { useMemo } from "react";
import { Target, BookOpen, ArrowRight, Flame, Zap } from "lucide-react";
import type { CourseCardProps } from "@/types/course.types";

type Enrollment = CourseCardProps["enrollment"];

interface LearningInsightsProps {
  activeEnrollments: Enrollment[];
  isLoading?: boolean;
  onBrowse: () => void;
  onResume: (enrollment: Enrollment) => void;
}

type RankedCourse = { enrollment: Enrollment; name: string; progress: number };

const ALMOST_DONE_THRESHOLD = 75;

function courseName(e: Enrollment): string {
  return (e as any)?.course?.name || "your course";
}

function progressOf(e: Enrollment): number {
  const p = Number((e as any)?.percentCompleted ?? 0);
  if (Number.isNaN(p)) return 0;
  return Math.max(0, Math.min(100, Math.round(p)));
}

const TONE_CONFIG = {
  emerald: {
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))",
    border: "rgba(16,185,129,0.2)",
    iconBg: "rgba(16,185,129,0.12)",
    iconColor: "#34d399",
    label: "#34d399",
    btnBg: "linear-gradient(135deg, #059669, #10b981)",
    shadow: "rgba(16,185,129,0.3)",
  },
  violet: {
    gradient: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.06))",
    border: "rgba(124,58,237,0.2)",
    iconBg: "rgba(124,58,237,0.12)",
    iconColor: "#a78bfa",
    label: "#a78bfa",
    btnBg: "linear-gradient(135deg, #7c3aed, #6366f1)",
    shadow: "rgba(124,58,237,0.3)",
  },
  amber: {
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.06))",
    border: "rgba(245,158,11,0.2)",
    iconBg: "rgba(245,158,11,0.12)",
    iconColor: "#fbbf24",
    label: "#fbbf24",
    btnBg: "linear-gradient(135deg, #d97706, #f59e0b)",
    shadow: "rgba(245,158,11,0.3)",
  },
};

export function LearningInsights({
  activeEnrollments,
  isLoading,
  onBrowse,
  onResume,
}: LearningInsightsProps) {
  const ranked = useMemo<RankedCourse[]>(
    () =>
      (activeEnrollments || [])
        .map((e) => ({ enrollment: e, name: courseName(e), progress: progressOf(e) }))
        .sort((a, b) => b.progress - a.progress),
    [activeEnrollments],
  );

  const recommendation = useMemo(() => {
    const almostDone = ranked.find((c) => c.progress >= ALMOST_DONE_THRESHOLD && c.progress < 100);
    if (almostDone) {
      return {
        tone: "emerald" as const,
        icon: <Flame className="h-5 w-5" />,
        emoji: "🔥",
        title: `You're almost there — finish ${almostDone.name}`,
        body: `Just ${100 - almostDone.progress}% to go. A short push wraps up this course.`,
        cta: "Resume course",
        onClick: () => onResume(almostDone.enrollment),
      };
    }
    const continueCourse = ranked[0];
    if (continueCourse) {
      return {
        tone: "violet" as const,
        icon: <Target className="h-5 w-5" />,
        emoji: "🎯",
        title: `Pick up where you left off in ${continueCourse.name}`,
        body: `You're ${continueCourse.progress}% through. Keep the momentum going.`,
        cta: "Continue learning",
        onClick: () => onResume(continueCourse.enrollment),
      };
    }
    return {
      tone: "amber" as const,
      icon: <BookOpen className="h-5 w-5" />,
      emoji: "✨",
      title: "Start your learning journey",
      body: "Browse the catalog and enroll in a course to see your insights here.",
      cta: "Browse courses",
      onClick: onBrowse,
    };
  }, [ranked, onBrowse, onResume]);

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-7 overflow-hidden">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-xl shimmer" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-lg shimmer" />
            <div className="h-3 w-20 rounded-lg shimmer" />
          </div>
        </div>
        <div className="h-24 w-full rounded-2xl shimmer mb-4" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 rounded-2xl shimmer" />
          ))}
        </div>
      </section>
    );
  }

  const tone = TONE_CONFIG[recommendation.tone];

  return (
    <section
      className="relative rounded-3xl border overflow-hidden bg-card p-6 sm:p-7 animate-slide-up-fade"
      style={{ borderColor: tone.border }}
    >
      {/* Ambient gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: tone.gradient, opacity: 0.6 }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <Zap className="h-4 w-4" style={{ color: tone.label }} />
          <div>
            <h2
              className="text-base font-bold tracking-tight text-foreground"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Learning Insights
            </h2>
            <p className="text-xs text-muted-foreground">Your next best step</p>
          </div>
        </div>

        {/* Primary recommendation card */}
        <div
          className="relative rounded-2xl border p-5 mb-4"
          style={{ borderColor: tone.border, background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {/* Icon */}
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ background: tone.iconBg }}
              >
                {recommendation.emoji}
              </span>
              <div className="min-w-0">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-0.5"
                  style={{ color: tone.label }}
                >
                  Next best action
                </p>
                <p className="text-sm font-bold text-foreground truncate">{recommendation.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{recommendation.body}</p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={recommendation.onClick}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: tone.btnBg,
                boxShadow: `0 4px 20px ${tone.shadow}`,
              }}
            >
              {recommendation.cta}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* "Closest to finishing" mini-list */}
        {ranked.some((c) => c.progress >= ALMOST_DONE_THRESHOLD && c.progress < 100) && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Almost there 🏁
            </p>
            <div className="space-y-2">
              {ranked
                .filter((c) => c.progress >= ALMOST_DONE_THRESHOLD && c.progress < 100)
                .slice(0, 2)
                .map((c) => (
                  <div
                    key={(c.enrollment as any)?._id || c.name}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface-2 px-3 py-2.5 hover-lift cursor-pointer"
                    onClick={() => onResume(c.enrollment)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {c.name}
                    </span>
                    {/* Gradient progress bar */}
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full progress-glow"
                        style={{
                          width: `${c.progress}%`,
                          background: "linear-gradient(to right, hsl(38 95% 58%), #34d399)",
                        }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs font-bold tabular-nums text-muted-foreground">
                      {c.progress}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
