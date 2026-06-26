"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { LogOut, Check, Circle, ChevronRight } from "lucide-react";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";
import { StepIcon } from "@/lib/icons";
import NextStepCard from "./NextStepCard";

/**
 * The member dropdown — the config-driven equivalent of the real product's
 * UserMenu. Header (name / email / progress bar), the personalized next-step
 * card, the Discipleship Track, the Next Steps list, and sign-out. Everything
 * is derived from the church config's `demoMember`.
 *
 * Architected so a future "View Profile" page can reuse `getMemberProgress`.
 */
export default function MemberMenu({
  isOpen,
  anchorRef,
  config,
  onSignOut,
  onClose,
}: {
  isOpen: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  config: ChurchConfig;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position below the anchor, aligned right.
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, [isOpen, anchorRef]);

  // Mount / close lifecycle (lets the exit animation play).
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [isOpen, mounted]);

  // Close on outside click (no blocking backdrop).
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(t) &&
        anchorRef.current &&
        !anchorRef.current.contains(t)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen, anchorRef, onClose]);

  if (!mounted) return null;

  const { demoMember } = config;
  const userName = `${demoMember.firstName} ${demoMember.lastName}`.trim();
  const { discipleshipSteps, nextSteps, allSteps, completedCount, totalCount, nextStep } =
    getMemberProgress(config);

  function renderStep(step: StepItem, animDelay: number) {
    const hasLink = !!step.href;
    const customIcon = step.icon ? (
      <span className="text-fg-tertiary">
        <StepIcon name={step.icon} />
      </span>
    ) : null;

    const icon = step.completed ? (
      <Check className="h-4 w-4 text-brand" />
    ) : customIcon ? (
      customIcon
    ) : step.inProgress ? (
      <Circle className="h-4 w-4 fill-amber-400/30 text-amber-400" />
    ) : (
      <Circle className="h-4 w-4 text-fg-faint" />
    );

    const style: React.CSSProperties = {
      opacity: 0,
      animation: closing
        ? "dropdownItemOut 0.15s ease-in forwards"
        : `dropdownItemIn 0.3s ease-out ${animDelay}s forwards`,
    };

    const rowClass =
      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors";
    const className = `${rowClass} ${
      step.completed
        ? "text-fg-muted hover:bg-surface-raised hover:text-fg-secondary"
        : "text-fg hover:bg-surface-raised"
    }`;

    const content = (
      <>
        {icon}
        <span className={step.completed ? "line-through" : ""}>{step.label}</span>
        {hasLink && !step.completed && (
          <ChevronRight className="ml-auto h-3.5 w-3.5 text-fg-muted" />
        )}
      </>
    );

    if (hasLink) {
      return (
        <a
          key={step.key}
          href={step.href}
          onClick={onClose}
          className={`${className} cursor-pointer`}
          style={style}
        >
          {content}
        </a>
      );
    }
    return (
      <div key={step.key} className={className} style={style}>
        {content}
      </div>
    );
  }

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[60] w-80 overflow-hidden rounded-xl border border-line shadow-2xl backdrop-blur-xl"
      style={{
        backgroundColor: "rgb(var(--surface) / var(--dropdown-bg-alpha))",
        top: pos.top,
        right: pos.right,
        animation: closing
          ? "dropdownOut 0.2s ease-in forwards"
          : "dropdownIn 0.25s ease-out forwards",
      }}
    >
      {/* Header */}
      <div
        className="border-b border-line px-4 py-3"
        style={{
          opacity: 0,
          animation: closing
            ? "dropdownItemOut 0.15s ease-in forwards"
            : "dropdownItemIn 0.3s ease-out 0.06s forwards",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-base font-medium text-fg">{userName}</p>
        </div>
        <p className="mt-0.5 text-sm text-fg-muted">{demoMember.email}</p>
        {totalCount > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(completedCount / totalCount) * 100}%`,
                  backgroundColor: "rgb(var(--brand) / 0.7)",
                }}
              />
            </div>
            <span className="text-xs font-medium text-fg-muted">
              {completedCount}/{totalCount}
            </span>
          </div>
        )}
      </div>

      {/* Personalized next step */}
      {totalCount > 0 && (
        <div
          className="px-2 pt-2.5"
          style={{
            opacity: 0,
            animation: closing
              ? "dropdownItemOut 0.15s ease-in forwards"
              : "dropdownItemIn 0.3s ease-out 0.09s forwards",
          }}
        >
          <NextStepCard
            nextStep={nextStep}
            totalCount={totalCount}
            variant="compact"
            onNavigate={onClose}
          />
        </div>
      )}

      {/* Discipleship Track */}
      {discipleshipSteps.length > 0 && (
        <div className="px-2 pt-2.5">
          <p
            className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted"
            style={{
              opacity: 0,
              animation: closing
                ? "dropdownItemOut 0.15s ease-in forwards"
                : "dropdownItemIn 0.3s ease-out 0.1s forwards",
            }}
          >
            Discipleship Track
          </p>
          {discipleshipSteps.map((step, i) => renderStep(step, 0.12 + i * 0.03))}
        </div>
      )}

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div className="px-2 pb-1 pt-2.5">
          <p
            className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted"
            style={{
              opacity: 0,
              animation: closing
                ? "dropdownItemOut 0.15s ease-in forwards"
                : `dropdownItemIn 0.3s ease-out ${0.1 + discipleshipSteps.length * 0.03 + 0.06}s forwards`,
            }}
          >
            Next Steps
          </p>
          {nextSteps.map((step, i) =>
            renderStep(step, 0.12 + discipleshipSteps.length * 0.03 + 0.08 + i * 0.03),
          )}
        </div>
      )}

      {/* Sign out */}
      <div className="mt-1 border-t border-line p-1.5">
        <button
          onClick={onSignOut}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg transition-colors hover:bg-surface-raised"
          style={{
            opacity: 0,
            animation: closing
              ? "dropdownItemOut 0.15s ease-in forwards"
              : `dropdownItemIn 0.3s ease-out ${0.12 + allSteps.length * 0.03 + 0.12}s forwards`,
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>,
    document.body,
  );
}
