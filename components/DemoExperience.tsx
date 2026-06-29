"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Info } from "lucide-react";
import type { ChurchConfig } from "@/lib/types";
import { getTemplateEntry, TEMPLATES } from "@/components/templates";
import { DemoCTAContext } from "@/context/DemoCTAContext";
import DemoChrome from "@/components/DemoChrome";
import DemoBar from "@/components/DemoBar";
import DemoClosingCTA from "@/components/DemoClosingCTA";
import DemoCTAModal from "@/components/DemoCTAModal";
import DemoInfoModal from "@/components/DemoInfoModal";
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
  // popup instead of doing nothing. The optional feature names what was clicked
  // so the popup can headline it ("Baptism Available in Full Build"). Kept
  // across close so the title doesn't flash to the fallback during the exit anim.
  const [ctaOpen, setCtaOpen] = useState(false);
  const [ctaFeature, setCtaFeature] = useState<string | undefined>(undefined);
  const openCTA = useCallback((feature?: string) => {
    setCtaFeature(feature);
    setCtaOpen(true);
  }, []);
  const closeCTA = useCallback(() => setCtaOpen(false), []);

  // The "how does this work?" explainer — opened from the toolbar's quiet "How
  // it works" button (public demo only; the admin preview doesn't render it).
  const [infoOpen, setInfoOpen] = useState(false);
  const openInfo = useCallback(() => setInfoOpen(true), []);
  const closeInfo = useCallback(() => setInfoOpen(false), []);

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
          onHowItWorks={embedded ? undefined : openInfo}
        />
        <Template config={activeConfig} />
        <DemoClosingCTA bookHref={bookHref} />
        {/* Clears the fixed mobile bottom bar so it never covers the CTA's tail. */}
        {!embedded && <div aria-hidden className="h-32 sm:hidden" />}

        <DemoCTAModal open={ctaOpen} onClose={closeCTA} bookHref={bookHref} feature={ctaFeature} />

        {/* Public demo only. MOBILE: the primary CTA floats bottom-right (prominent,
            gentle glow) while "How this works" lives in the bar. DESKTOP: reverts to
            the original — the CTA is inline in the bar, and "How does this work?" is a
            quiet floating button bottom-left. Both live here (outside DemoBar's
            backdrop-blur, so `fixed` anchors to the viewport) and open one modal. */}
        {!embedded && (
          <>
            {/* Mobile floating CTA. Plain anchor (full page nav) so the studio's dark
                CSS can't bleed onto /book during a client-side transition. */}
            <motion.a
              href={bookHref}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="fixed bottom-16 right-4 z-[70] inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3.5 text-[14px] font-bold text-on-accent shadow-[0_16px_40px_-12px_rgb(var(--brand)_/_0.8)] sm:hidden"
            >
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full bg-brand"
                animate={{ opacity: [0, 0.4, 0], scale: [1, 1.22, 1.32] }}
                transition={{ duration: 2.8, ease: "easeOut", repeat: Infinity, repeatDelay: 1.4 }}
              />
              <span className="relative">Let{"’"}s Chat</span>
              <ArrowRight className="relative h-4 w-4" />
            </motion.a>

            {/* Desktop floating "how does this work?" — quiet, neutral, bottom-left. */}
            <motion.button
              type="button"
              onClick={openInfo}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              aria-label="How this demo works"
              className="fixed bottom-6 left-6 z-[70] hidden items-center gap-2 rounded-full border border-edge bg-card/95 py-2.5 pl-3 pr-4 text-[12.5px] font-semibold text-ink-soft shadow-[0_8px_24px_-12px_rgba(0,0,0,0.3)] backdrop-blur-md transition-colors hover:text-ink sm:flex"
            >
              <span className="relative flex h-[17px] w-[17px] items-center justify-center text-ink">
                <Info className="h-[17px] w-[17px]" strokeWidth={2} />
                <span className="absolute -right-1 -top-1 flex h-[7px] w-[7px]">
                  <motion.span
                    aria-hidden
                    className="absolute inline-flex h-full w-full rounded-full bg-brand"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: 0, scale: 2.4 }}
                    transition={{ duration: 2.2, ease: "easeOut", repeat: Infinity }}
                  />
                  <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-brand" />
                </span>
              </span>
              <span className="whitespace-nowrap">How does this work?</span>
            </motion.button>

            <DemoInfoModal open={infoOpen} onClose={closeInfo} />
          </>
        )}

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
