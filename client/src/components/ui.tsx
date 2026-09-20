import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ step, title }: { step: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {step}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground " +
  "outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "border border-border bg-background text-foreground hover:bg-muted";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse-soft rounded-lg bg-muted ${className}`} />;
}

export function Notice({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "error" }) {
  const styles =
    tone === "error"
      ? "bg-accent/15 text-accent-foreground"
      : "bg-secondary/65 text-secondary-foreground";
  return (
    <div className={`animate-rise mt-5 flex gap-3 rounded-xl p-4 text-sm leading-6 ${styles}`}>
      {children}
    </div>
  );
}
