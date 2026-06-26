import type { ChurchConfig, DemoMember, IconName, PathwayStep } from "./types";

/**
 * A resolved step ready for rendering — a PathwayStep merged with the demo
 * member's progress. Structurally close to the StepItem the real product's
 * UserMenu/profile build, so templates feel familiar.
 */
export interface StepItem {
  key: string;
  label: string;
  description?: string;
  ctaLabel?: string;
  meta?: string;
  completed: boolean;
  inProgress: boolean;
  icon?: IconName;
  href?: string;
  order: number;
}

const byOrder = (a: StepItem, b: StepItem) => a.order - b.order;

/** Merge a list of step definitions with the member's per-step status. */
export function buildStepItems(
  defs: PathwayStep[],
  member: DemoMember,
): StepItem[] {
  const statusByKey = new Map(member.steps.map((s) => [s.key, s.status]));
  return defs
    .map((def) => {
      const status = statusByKey.get(def.key) ?? "not-started";
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        ctaLabel: def.ctaLabel,
        meta: def.meta,
        completed: status === "complete",
        inProgress: status === "in-progress",
        icon: def.icon,
        href: def.href,
        order: def.order,
      };
    })
    .sort(byOrder);
}

/** Everything a template/menu needs to render the member's progress. */
export interface MemberProgress {
  discipleshipSteps: StepItem[];
  nextSteps: StepItem[];
  /** All steps across both lists, sorted by order. */
  allSteps: StepItem[];
  completedCount: number;
  totalCount: number;
  /** The single next action — first incomplete step across both tracks. */
  nextStep: StepItem | null;
}

/** Compute the full progress model for a church's demo member. */
export function getMemberProgress(config: ChurchConfig): MemberProgress {
  const { demoMember } = config;
  const discipleshipSteps = buildStepItems(config.discipleshipTrack, demoMember);
  const nextSteps = buildStepItems(config.nextSteps, demoMember);
  const allSteps = [...discipleshipSteps, ...nextSteps].sort(byOrder);
  const completedCount = allSteps.filter((s) => s.completed).length;
  return {
    discipleshipSteps,
    nextSteps,
    allSteps,
    completedCount,
    totalCount: allSteps.length,
    nextStep: allSteps.find((s) => !s.completed) ?? null,
  };
}
