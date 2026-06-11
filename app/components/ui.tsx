import type { AnchorHTMLAttributes, ReactNode } from "react";

/* Site-wide layout container */
export function Wrap({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-[1340px] px-8 max-[720px]:px-5 ${className}`}>
      {children}
    </div>
  );
}

/* Small mono label with the accent dash, used above section titles */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[9px] font-mono text-[12.5px] font-medium uppercase tracking-[0.16em] text-accent before:h-px before:w-[22px] before:bg-accent before:opacity-70 before:content-[''] ${className}`}
    >
      {children}
    </span>
  );
}

/* Section heading (serif display) */
export function SecTitle({
  as: Tag = "h2",
  children,
  className = "",
}: {
  as?: "h1" | "h2" | "h3";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag
      className={`mt-[18px] font-serif text-[clamp(36px,4vw,50px)] leading-[1.04] tracking-[-0.025em] [font-weight:460] ${className}`}
    >
      {children}
    </Tag>
  );
}

/* Pill-shaped CTA link */
export function Btn({
  variant = "primary",
  sm = false,
  className = "",
  children,
  ...rest
}: {
  variant?: "primary" | "ghost" | "ghostLight";
  sm?: boolean;
  className?: string;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const base =
    "group inline-flex items-center justify-center whitespace-nowrap rounded-full font-sans tracking-[-0.01em] [font-weight:580] transition-[translate,scale,background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:translate-y-px active:scale-[0.99]";
  const size = sm
    ? "gap-[9px] px-4 py-2.5 text-sm"
    : "gap-[9px] px-[22px] py-3.5 text-[15.5px]";
  const look = {
    primary:
      "bg-accent text-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_10px_24px_-12px_var(--color-accent)] hover:-translate-y-px hover:bg-accent-deep",
    ghost:
      "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:-translate-y-px hover:shadow-[inset_0_0_0_1.5px_var(--color-ink)]",
    ghostLight:
      "bg-transparent text-paper shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--color-paper)_30%,transparent)] hover:-translate-y-px hover:shadow-[inset_0_0_0_1.5px_var(--color-paper)]",
  }[variant];
  return (
    <a className={`${base} ${size} ${look} ${className}`} {...rest}>
      {children}
    </a>
  );
}

/* Arrow that nudges right when the parent Btn (or any `group`) is hovered */
export function Arrow({ children = "→" }: { children?: ReactNode }) {
  return (
    <span className="transition-transform duration-200 group-hover:translate-x-[3px]">
      {children}
    </span>
  );
}

/* macOS-style window dots for demo frames */
export function TrafficLights({ small = false }: { small?: boolean }) {
  const dot = small ? "h-[9px] w-[9px]" : "h-2.5 w-2.5";
  return (
    <>
      <span className={`${dot} rounded-full bg-[#d9806b]`} />
      <span className={`${dot} rounded-full bg-[#d9b86b]`} />
      <span className={`${dot} rounded-full bg-[#8fbf8a]`} />
    </>
  );
}
