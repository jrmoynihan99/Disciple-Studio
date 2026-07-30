import type { ReactNode } from "react";

/* Dark phone mockup. size "sm" is the floating feature-row phone,
   "lg" the big centered login/demo phone. Width, position, and
   animation come from className; screen height from screenClassName. */
export default function PhoneFrame({
  size = "sm",
  className = "",
  screenClassName = "",
  children,
}: {
  size?: "sm" | "lg";
  className?: string;
  screenClassName?: string;
  children: ReactNode;
}) {
  const frame =
    size === "lg"
      ? "rounded-[44px] p-2.5 shadow-[0_60px_140px_-40px_rgba(187,74,35,0.35)]"
      : "rounded-[40px] p-[9px] shadow-[0_60px_120px_-50px_rgba(0,0,0,0.95)]";
  const notch =
    size === "lg" ? "top-5 h-3 w-[84px]" : "top-[17px] h-[11px] w-[74px]";
  const screen = size === "lg" ? "rounded-[34px]" : "rounded-[31px]";

  return (
    <div
      className={`relative border border-paper/10 bg-[#0a0a08] ${frame} ${className}`}
    >
      <span
        aria-hidden
        className={`absolute left-1/2 z-[3] -translate-x-1/2 rounded-full bg-[#0a0a08] ${notch}`}
      />
      <div
        className={`relative overflow-hidden bg-[#161310] ${screen} ${screenClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
