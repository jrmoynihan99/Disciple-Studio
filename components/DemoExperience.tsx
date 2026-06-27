"use client";

import { useMemo, useState } from "react";
import type { ChurchConfig } from "@/lib/types";
import { getTemplateEntry, TEMPLATES } from "@/components/templates";
import DemoChrome from "@/components/DemoChrome";
import DemoBar from "@/components/DemoBar";
import DemoClosingCTA from "@/components/DemoClosingCTA";

/**
 * The full church-facing demo: the framing/control bar, the chosen template, and
 * the closing CTA — all wrapped in DemoChrome (theme + demo-auth).
 *
 * The viewer can switch between the three design directions; switching only
 * swaps the template's layout + serif (the palettes are shared), so their logo,
 * name, colors, and next steps stay put. In the admin preview (`embedded`) the
 * bar is inline (not sticky), and passing `onTemplateChange` makes the switcher
 * drive the editor form, so the bar and the form's template picker stay in sync.
 */
export default function DemoExperience({
  config,
  startSignedIn = true,
  embedded = false,
  onTemplateChange,
}: {
  config: ChurchConfig;
  startSignedIn?: boolean;
  embedded?: boolean;
  /** When provided, the switcher is controlled by the parent (the editor form)
   *  instead of local state — keeps the bar and the form picker in sync. */
  onTemplateChange?: (key: string) => void;
}) {
  const [picked, setPicked] = useState(config.template);
  const controlled = onTemplateChange != null;
  const templateKey = controlled ? config.template : picked;
  const changeTemplate = controlled ? onTemplateChange : setPicked;

  // Switching template just overrides which layout renders; the shared palettes
  // mean the church's colors carry over untouched.
  const activeConfig = useMemo<ChurchConfig>(
    () => (templateKey === config.template ? config : { ...config, template: templateKey }),
    [config, templateKey],
  );

  const { component: Template, selfChrome } = getTemplateEntry(templateKey);
  const bookHref = `/book?church=${encodeURIComponent(config.slug)}`;
  const templateOptions = Object.entries(TEMPLATES).map(([key, entry]) => ({
    key,
    label: entry.label,
  }));

  return (
    <DemoChrome config={activeConfig} startSignedIn={startSignedIn} showMemberArea={!selfChrome}>
      <DemoBar
        churchName={config.churchName}
        bookHref={bookHref}
        sticky={!embedded}
        templates={templateOptions}
        activeTemplate={templateKey}
        onTemplateChange={changeTemplate}
      />
      <Template config={activeConfig} />
      <DemoClosingCTA churchName={config.churchName} bookHref={bookHref} />
    </DemoChrome>
  );
}
