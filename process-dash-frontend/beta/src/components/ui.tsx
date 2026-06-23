/**
 * Process Dash — shared dark UI primitives.
 * All components use CSS variables from index.css.
 */

import { ReactNode } from "react";

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", style }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
  warn?: boolean;
}

export function MetricCard({ label, value, sub, accent, danger, warn }: MetricCardProps) {
  const valueColor = accent
    ? "var(--accent)"
    : danger
    ? "var(--red)"
    : warn
    ? "var(--yellow)"
    : "var(--text)";

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <div
        className="mono"
        style={{ fontSize: 22, fontWeight: 700, color: valueColor, lineHeight: 1.2 }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-2)",
          marginTop: 4,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "accent" | "green" | "red" | "yellow" | "ghost";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const badgeStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: "var(--surface-3)", color: "var(--text-2)", border: "1px solid var(--border-2)" },
  accent:  { background: "var(--accent-bg)", color: "var(--accent)",  border: "1px solid rgba(129,140,248,0.25)" },
  green:   { background: "var(--green-bg)",  color: "var(--green)",   border: "1px solid rgba(74,222,128,0.2)" },
  red:     { background: "var(--red-bg)",    color: "var(--red)",     border: "1px solid rgba(248,113,113,0.2)" },
  yellow:  { background: "var(--yellow-bg)", color: "var(--yellow)",  border: "1px solid rgba(251,191,36,0.2)" },
  ghost:   { background: "transparent",      color: "var(--text-3)",  border: "1px solid var(--border)" },
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      style={{
        ...badgeStyles[variant],
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        padding: "2px 7px",
        borderRadius: 4,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
  fontWeight: 500,
  border: "1px solid transparent",
  borderRadius: 6,
  cursor: "pointer",
  transition: "opacity 0.15s, background 0.15s",
  whiteSpace: "nowrap",
};

const btnVariants: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: "var(--accent)",    color: "#fff",           border: "1px solid var(--accent-hover)" },
  secondary: { background: "var(--surface-3)", color: "var(--text)",    border: "1px solid var(--border-2)" },
  ghost:     { background: "transparent",      color: "var(--text-2)",  border: "1px solid transparent" },
  danger:    { background: "var(--red-bg)",     color: "var(--red)",    border: "1px solid rgba(248,113,113,0.3)" },
};

const btnSizes: Record<"sm" | "md", React.CSSProperties> = {
  sm: { fontSize: 12, padding: "4px 10px" },
  md: { fontSize: 13, padding: "6px 14px" },
};

export function Button({ variant = "secondary", size = "md", style, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...btnBase,
        ...btnVariants[variant],
        ...btnSizes[size],
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>{label}</label>
      )}
      <input
        {...props}
        style={{
          width: "100%",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          borderRadius: 6,
          padding: "7px 10px",
          fontSize: 13,
          fontFamily: "inherit",
          ...style,
        }}
      />
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, style, children, ...props }: SelectProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>{label}</label>
      )}
      <select
        {...props}
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          borderRadius: 6,
          padding: "7px 10px",
          fontSize: 13,
          fontFamily: "inherit",
          ...style,
        }}
      >
        {children}
      </select>
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, style, ...props }: TextareaProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>{label}</label>
      )}
      <textarea
        {...props}
        style={{
          width: "100%",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          borderRadius: 6,
          padding: "7px 10px",
          fontSize: 13,
          fontFamily: "inherit",
          resize: "vertical",
          ...style,
        }}
      />
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  sub?: string;
  right?: ReactNode;
}

export function PageHeader({ title, sub, right }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 24,
        gap: 16,
      }}
    >
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "var(--text)" }}>{title}</h1>
        {sub && (
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: "3px 0 0" }}>{sub}</p>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

interface SectionProps {
  title?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function Section({ title, children, style }: SectionProps) {
  return (
    <section style={{ marginBottom: 24, ...style }}>
      {title && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {title}
        </div>
      )}
      {children}
    </section>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  sub?: string;
}

export function EmptyState({ icon = "·", title, sub }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        color: "var(--text-3)",
        textAlign: "center",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 500 }}>{title}</div>
      {sub && <div style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: React.CSSProperties }) {
  return (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--border)",
        margin: "16px 0",
        ...style,
      }}
    />
  );
}

// ── Loading ───────────────────────────────────────────────────────────────────

export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        color: "var(--text-3)",
        fontSize: 13,
        gap: 8,
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          border: "2px solid var(--border-2)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          display: "inline-block",
          animation: "spin 0.6s linear infinite",
        }}
      />
      {text}
    </div>
  );
}
