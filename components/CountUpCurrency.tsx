"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import NumberFlow, { type NumberFlowElement } from "@number-flow/react";
import { EASE } from "@/lib/motion";

/**
 * A currency figure that spins up from $0 to `value` with NumberFlow once it
 * scrolls into view (so the count-up is actually seen on these tall dashboards,
 * not spent off-screen on load). Inherits the surrounding font/size via
 * `className`. Respects reduced-motion automatically (NumberFlow default).
 */
export default function CountUpCurrency({
  value,
  className,
  currency = "USD",
}: {
  value: number;
  className?: string;
  currency?: string;
}) {
  const ref = useRef<NumberFlowElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setShown(value), 120);
    return () => clearTimeout(t);
  }, [inView, value]);

  return (
    <NumberFlow
      ref={ref}
      value={shown}
      format={{ style: "currency", currency, maximumFractionDigits: 0 }}
      locales="en-US"
      className={className}
      willChange
      spinTiming={{ duration: 900, easing: `cubic-bezier(${EASE.join(",")})` }}
    />
  );
}
