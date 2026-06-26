import type { ComponentType } from "react";
import type { ChurchConfig } from "@/lib/types";
import MemberDashboardEditorial from "./MemberDashboardEditorial";
import MemberDashboardBentoWarm from "./MemberDashboardBentoWarm";
import MemberDashboardGuideWarm from "./MemberDashboardGuideWarm";

/**
 * Template registry.
 *
 * Each template is a self-chromed member dashboard: it renders its own header +
 * member dropdown, so DemoChrome does NOT overlay the floating MemberArea
 * (`selfChrome: true`). All read the same ChurchConfig — switch a church's
 * design by changing its `template` field; the data doesn't change.
 *
 * To add another design (e.g. another export from Claude Design): port it to a
 * component here, register it under a key, and it becomes selectable.
 */
export type TemplateComponent = ComponentType<{ config: ChurchConfig }>;

export interface TemplateEntry {
  component: TemplateComponent;
  /** Human label for the admin picker. */
  label: string;
  selfChrome?: boolean;
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  editorial: { component: MemberDashboardEditorial, label: "Editorial", selfChrome: true },
  "warm-bento": { component: MemberDashboardBentoWarm, label: "Warm Bento", selfChrome: true },
  "warm-guide": { component: MemberDashboardGuideWarm, label: "Warm Guide", selfChrome: true },
};

export const DEFAULT_TEMPLATE = "editorial";

/** Resolve a template entry by key, falling back to the default. */
export function getTemplateEntry(key: string): TemplateEntry {
  return TEMPLATES[key] ?? TEMPLATES[DEFAULT_TEMPLATE];
}

/** Convenience: just the component. */
export function getTemplate(key: string): TemplateComponent {
  return getTemplateEntry(key).component;
}
