"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { ChurchConfig } from "@/lib/types";
import { getTemplateEntry, TEMPLATES } from "@/components/templates";
import { DemoCTAContext } from "@/context/DemoCTAContext";
import DemoChrome from "@/components/DemoChrome";
import DemoBar from "@/components/DemoBar";
import DemoClosingCTA from "@/components/DemoClosingCTA";
import DemoCTAModal from "@/components/DemoCTAModal";
import DemoIntro from "@/components/DemoIntro";

/**
 * The full church-facing demo: the framing/control bar, the chosen template, and
 * the closing CTA — all wrapped in DemoChrome (theme + demo-auth).
 *
 * The viewer can switch between the published design directions; switching only
 * swaps the template's layout + serif (the palettes are shared), so their logo,
 * name, colors, and next steps stay put. In the admin preview (`embedded`) the
 * bar is inline (not sticky), and passing `onTemplateChange` makes the switcher
 * drive the editor form, so the bar and the form's template picker stay in sync.
 */
export default function DemoExperience({
  config,
  startSignedIn = true,
  embedded = false,
  introSeen = false,
  onTemplateChange,
}: {
  config: ChurchConfig;
  startSignedIn?: boolean;
  embedded?: boolean;
  /** From the server cookie — when true the pre-screen has already been seen on
   *  this browser, so it isn't rendered at all (no flash on return visits). */
  introSeen?: boolean;
  /** When provided, the switcher is controlled by the parent (the editor form)
   *  instead of local state — keeps the bar and the form picker in sync. */
  onTemplateChange?: (key: string) => void;
}) {
  // The templates published for this demo — the only ones the bar switches
  // between. Omitted ⇒ every registered template (older demos saved before the
  // field existed). Kept in registry order so the bar reads consistently.
  const publishedKeys = useMemo(() => {
    const all = Object.keys(TEMPLATES);
    const chosen = config.templates?.filter((k) => k in TEMPLATES) ?? [];
    return chosen.length ? all.filter((k) => chosen.includes(k)) : all;
  }, [config.templates]);

  // First-shown template: the configured one when it's published, else the first
  // published key (never a hidden template).
  const initialKey = publishedKeys.includes(config.template) ? config.template : publishedKeys[0];
  const [picked, setPicked] = useState(initialKey);
  const controlled = onTemplateChange != null;
  const templateKey = controlled ? config.template : picked;
  const changeTemplate = controlled ? onTemplateChange : setPicked;

  // The pre-screen plays on the public demo (not the editor preview), once per
  // browser — the server reads the cookie and skips it on return visits.
  const [showIntro, setShowIntro] = useState(!embedded && !introSeen);
  const dismissIntro = useCallback(() => setShowIntro(false), []);

  // Every placeholder button in a template opens this "it's a demo → let's talk"
  // popup instead of doing nothing.
  const [ctaOpen, setCtaOpen] = useState(false);
  const openCTA = useCallback(() => setCtaOpen(true), []);
  const closeCTA = useCallback(() => setCtaOpen(false), []);

  // Switching template just overrides which layout renders; the shared palettes
  // mean the church's colors carry over untouched.
  const activeConfig = useMemo<ChurchConfig>(
    () => (templateKey === config.template ? config : { ...config, template: templateKey }),
    [config, templateKey],
  );

  const { component: Template, selfChrome } = getTemplateEntry(templateKey);
  const bookHref = `/book?church=${encodeURIComponent(config.slug)}`;
  const templateOptions = publishedKeys.map((key) => ({
    key,
    label: TEMPLATES[key].label,
  }));

  return (
    <DemoCTAContext.Provider value={openCTA}>
      <DemoChrome config={activeConfig} startSignedIn={startSignedIn} showMemberArea={!selfChrome}>
        <DemoBar
          bookHref={bookHref}
          sticky={!embedded}
          templates={templateOptions}
          activeTemplate={templateKey}
          onTemplateChange={changeTemplate}
        />
        <Template config={activeConfig} />
        <DemoClosingCTA bookHref={bookHref} />
        {/* Clears the fixed mobile bottom bar so it never covers the CTA's tail. */}
        {!embedded && <div aria-hidden className="h-32 sm:hidden" />}

        <DemoCTAModal open={ctaOpen} onClose={closeCTA} bookHref={bookHref} />

        <AnimatePresence>
          {showIntro && (
            <DemoIntro
              key="intro"
              churchName={config.churchName}
              logoUrl={config.logoUrl}
              cookieName={`ds_intro_${config.slug}`}
              persist
              onDone={dismissIntro}
            />
          )}
        </AnimatePresence>
      </DemoChrome>
    </DemoCTAContext.Provider>
  );
}
