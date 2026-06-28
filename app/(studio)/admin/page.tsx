"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChurchConfig, IconName, PathwayStep, StepStatus } from "@/lib/types";
import { ICON_NAMES } from "@/lib/icons";
import { TEMPLATES } from "@/components/templates";
import { listPaletteSwatches, paletteAccents, paletteDefaults, type PaletteSwatch } from "@/lib/themes";
import DemoExperience from "@/components/DemoExperience";

/**
 * Local church builder + editor. Fill the form, watch the live preview, then
 * Save — which writes `src/churches/data/<slug>.json` via the API. Open with
 * `?slug=<slug>` to edit an existing demo (its file loads into the form).
 *
 * Editing preserves fields the form doesn't expose (welcome line copy isn't
 * lost, etc.) by merging the form output onto the loaded config — see
 * `mergeConfig`.
 */

type StepDraft = {
  key?: string;
  label: string;
  icon: IconName;
  status: StepStatus;
  /** Longer copy shown in the focal step card on the right. */
  description?: string;
  /** Button label on the focal card, e.g. "Browse groups". */
  ctaLabel?: string;
  /** Small meta line under the card, e.g. "4 groups near you · ~2 min". */
  meta?: string;
};

const STATUS_CYCLE: StepStatus[] = ["not-started", "in-progress", "complete"];
const STATUS_LABEL: Record<StepStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  complete: "Complete",
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** The demo member's fixed fields. The first name is editable per demo (see the
 *  `memberName` form field); `firstName` here is just the default. The rest are
 *  the same for every demo and never rendered by the templates. */
const DEMO_MEMBER = {
  firstName: "Sarah",
  lastName: "Thompson",
  email: "sarah.t@example.com",
  campus: "Downtown",
  memberSince: "Member since 2023",
};

const DEFAULT_TRACK: StepDraft[] = [
  {
    label: "Attend a Sunday gathering",
    icon: "church",
    status: "complete",
    description: "You showed up — that's where it all starts. Worship together, hear the Word, and meet the family you're now part of.",
    ctaLabel: "See service times",
    meta: "Sundays · 9 & 11 AM",
  },
  {
    label: "Get baptized",
    icon: "droplets",
    status: "complete",
    description: "A public yes to following Jesus. You went under the water and came up new — the whole church celebrated with you.",
    ctaLabel: "Watch your baptism",
    meta: "Completed · 2023",
  },
  {
    label: "Join a community group",
    icon: "users",
    status: "in-progress",
    description: "Faith grows best in circles, not rows. Find a handful of people to share life, prayer, and a regular table with.",
    ctaLabel: "Browse groups near you",
    meta: "4 groups near you · ~2 min",
  },
  {
    label: "Take the membership class",
    icon: "heart",
    status: "not-started",
    description: "Make it official. Learn who we are, what we believe, and how you fit into the mission of this church.",
    ctaLabel: "Reserve a seat",
    meta: "Next class · first Sunday",
  },
];
const DEFAULT_NEXT: StepDraft[] = [
  {
    label: "Find a place to serve",
    icon: "hand-heart",
    status: "not-started",
    description: "You were made to give, not just receive. Use your gifts to make a Sunday — and someone's week — better.",
    ctaLabel: "Explore serving teams",
    meta: "12 teams · all gifts welcome",
  },
  {
    label: "Set up recurring giving",
    icon: "sparkles",
    status: "not-started",
    description: "Generosity becomes a rhythm when it's automatic. Partner with what God is doing here, one gift at a time.",
    ctaLabel: "Set up giving",
    meta: "Takes about a minute",
  },
];

function AdminInner() {
  const router = useRouter();
  const editingSlug = useSearchParams().get("slug");

  const [churchName, setChurchName] = useState("Grace Community Church");
  const [tagline, setTagline] = useState("Knowing God. Making Him known.");
  // Accent defaults to the chosen palette's accent; the override is opt-in and
  // can set a separate accent per mode (light / dark).
  const [accentOverride, setAccentOverride] = useState(false);
  const [accentLight, setAccentLight] = useState("#9e6450");
  const [accentDark, setAccentDark] = useState("#c98a6b");
  // `template` is the one previewed (and shown first in the live demo); it must
  // stay a member of `published`, the set of templates that go live.
  const [template, setTemplate] = useState("editorial");
  const [published, setPublished] = useState<string[]>(Object.keys(TEMPLATES));
  const [paletteLight, setPaletteLight] = useState("");
  const [paletteDark, setPaletteDark] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [welcomeLine, setWelcomeLine] = useState(
    "We're so glad you're here — here are your next steps, your group, your giving, and more",
  );
  const [memberName, setMemberName] = useState(DEMO_MEMBER.firstName);
  const [track, setTrack] = useState<StepDraft[]>(DEFAULT_TRACK);
  const [next, setNext] = useState<StepDraft[]>(DEFAULT_NEXT);

  const [loaded, setLoaded] = useState<ChurchConfig | null>(null);
  const [previewSignedIn, setPreviewSignedIn] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load an existing demo into the form when ?slug is present.
  useEffect(() => {
    if (!editingSlug) return;
    fetch(`/api/churches/${editingSlug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((c: ChurchConfig) => {
        setLoaded(c);
        setChurchName(c.churchName);
        setTagline(c.tagline ?? "");
        setAccentOverride(!!(c.brand?.accent || c.brand?.accentLight || c.brand?.accentDark));
        setAccentLight(c.brand?.accentLight ?? c.brand?.accent ?? "#9e6450");
        setAccentDark(c.brand?.accentDark ?? c.brand?.accent ?? "#c98a6b");
        // Published set: stored `templates` when present (older demos lack it →
        // all published), normalized to registry order and valid keys.
        const pub = c.templates?.filter((k) => k in TEMPLATES) ?? [];
        const publishedList = pub.length
          ? Object.keys(TEMPLATES).filter((k) => pub.includes(k))
          : Object.keys(TEMPLATES);
        setPublished(publishedList);
        setTemplate(publishedList.includes(c.template) ? c.template : publishedList[0]);
        setPaletteLight(c.palette?.light ?? "");
        setPaletteDark(c.palette?.dark ?? "");
        setLogoUrl(c.logoUrl ?? "");
        setWelcomeLine(c.welcomeLine ?? "");
        setMemberName(c.demoMember.firstName || DEMO_MEMBER.firstName);
        const statusByKey = new Map(c.demoMember.steps.map((s) => [s.key, s.status]));
        const toDrafts = (steps: PathwayStep[]): StepDraft[] =>
          steps.map((s) => ({
            key: s.key,
            label: s.label,
            icon: (s.icon ?? "star") as IconName,
            status: statusByKey.get(s.key) ?? "not-started",
            description: s.description ?? "",
            ctaLabel: s.ctaLabel ?? "",
            meta: s.meta ?? "",
          }));
        setTrack(toDrafts(c.discipleshipTrack));
        setNext(toDrafts(c.nextSteps));
      })
      .catch(() => alert("Could not load that demo."));
  }, [editingSlug]);

  // The slug is just the church name. In edit mode it's locked to the loaded
  // file (renaming a church would be a new file).
  const slug = editingSlug ?? (slugify(churchName) || "church");

  const lightSwatches = listPaletteSwatches(template, "light");
  const darkSwatches = listPaletteSwatches(template, "dark");
  const paletteDefault = paletteDefaults(template);
  // The accent each chosen palette yields, shown when not overriding.
  const accents = paletteAccents(template, paletteLight || undefined, paletteDark || undefined);

  const config = useMemo<ChurchConfig>(
    () =>
      buildConfig({
        slug, churchName, tagline,
        accentLight: accentOverride ? accentLight : undefined,
        accentDark: accentOverride ? accentDark : undefined,
        template, templates: published, memberName,
        paletteLight, paletteDark, logoUrl, welcomeLine,
        track, next,
      }),
    [slug, churchName, tagline, accentOverride, accentLight, accentDark, template, published, memberName, paletteLight, paletteDark, logoUrl, welcomeLine, track, next],
  );

  // Set the first-shown template (`config.template`) — the one the demo opens
  // on, and what the editor preview displays. Driven by both the "Shows first"
  // picker and the preview's in-bar switcher. Palettes are shared across
  // templates, so the chosen palette carries over untouched.
  function selectTemplate(key: string) {
    setTemplate(key);
  }

  // Toggle a template in/out of the published set (the form's template grid).
  // Always keeps at least one published: adding a template also previews it;
  // removing the previewed one falls back to another published template.
  function togglePublished(key: string) {
    if (published.includes(key)) {
      if (published.length === 1) return; // at least one must stay live
      const next = published.filter((k) => k !== key);
      setPublished(next);
      if (template === key) setTemplate(Object.keys(TEMPLATES).find((k) => next.includes(k))!);
    } else {
      setPublished([...published, key]);
      setTemplate(key); // preview what was just added
    }
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Upload failed");
        return;
      }
      setLogoUrl(data.url);
    } catch {
      alert("Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const merged = mergeConfig(loaded ?? {}, config);
      const res = await fetch(`/api/churches/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Save failed" }));
        alert(error || "Save failed");
        return;
      }
      // Back to the studio index (NOT the marketing "/"). Staying in the studio
      // world also avoids the demo CSS bleeding onto the marketing pages.
      router.push("/studio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-fg lg:flex-row">
      {/* ── Form ── */}
      <div className="w-full shrink-0 overflow-y-auto border-b border-line p-6 lg:h-screen lg:w-[420px] lg:border-b-0 lg:border-r">
        <h1 className="text-xl font-bold">{editingSlug ? "Edit demo" : "New demo"}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          URL: <span className="text-fg-secondary">/c/{slug}</span>
        </p>

        <Group title="Identity">
          <Field label="Church name" value={churchName} onChange={setChurchName} />
          <Field label="Tagline" value={tagline} onChange={setTagline} />
          <Field label="Welcome line" value={welcomeLine} onChange={setWelcomeLine} />
          <div>
            <Field label="Member name" value={memberName} onChange={setMemberName} />
            <p className="mt-1 text-xs text-fg-muted">
              The signed-in demo member — shown in the greeting, the user menu, and the avatar initial.
            </p>
          </div>

          <div>
            <span className="mb-1 block text-xs text-fg-muted">Logo (optional)</span>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-11 w-11 flex-none rounded-lg border border-line bg-surface-raised object-contain p-0.5"
                />
              ) : (
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-dashed border-line text-fg-muted">
                  —
                </div>
              )}
              <label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-raised">
                {uploadingLogo ? "Uploading…" : logoUrl ? "Replace" : "Upload image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) uploadLogo(f);
                  }}
                />
              </label>
              {logoUrl && !uploadingLogo && (
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="text-sm text-fg-muted hover:text-error"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </Group>

        <Group title="Branding">
          {/* Templates — multi-select which layouts go live */}
          <div>
            <span className="mb-1.5 block text-xs text-fg-muted">Templates</span>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TEMPLATES).map(([key, entry]) => {
                const isPublished = published.includes(key);
                const isOnlyOne = isPublished && published.length === 1;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePublished(key)}
                    aria-pressed={isPublished}
                    disabled={isOnlyOne}
                    title={isOnlyOne ? "At least one template must stay selected" : undefined}
                    className={`relative overflow-hidden rounded-lg border bg-surface text-left transition ${
                      isPublished
                        ? "border-fg ring-1 ring-fg"
                        : "border-line opacity-50 hover:border-line-hover hover:opacity-100"
                    } ${isOnlyOne ? "cursor-default" : ""}`}
                  >
                    <TemplateThumb templateKey={key} />
                    <div className="border-t border-line px-2 py-1 text-[11px] font-medium text-fg-secondary">
                      {entry.label}
                    </div>
                    {isPublished && <SelectedBadge />}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-fg-muted">
              Selected templates go live — viewers switch between them in the demo bar.
            </p>

            {/* Shows first — pick which published template the demo opens on */}
            {published.length > 1 && (
              <div className="mt-3.5">
                <span className="mb-1.5 block text-xs text-fg-muted">Shows first</span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(TEMPLATES)
                    .filter((k) => published.includes(k))
                    .map((key) => {
                      const isDefault = template === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectTemplate(key)}
                          aria-pressed={isDefault}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                            isDefault
                              ? "border-fg bg-surface-inverted text-fg-inverted"
                              : "border-line text-fg-secondary hover:border-line-hover"
                          }`}
                        >
                          {TEMPLATES[key].label}
                        </button>
                      );
                    })}
                </div>
                <p className="mt-1.5 text-xs text-fg-muted">
                  The template the demo opens on. Viewers can still switch between all selected templates.
                </p>
              </div>
            )}
          </div>

          {/* Palettes — pick a light + dark preset */}
          <PaletteRow
            label="Light palette"
            swatches={lightSwatches}
            selected={paletteLight || paletteDefault.light}
            onSelect={setPaletteLight}
          />
          <PaletteRow
            label="Dark palette"
            swatches={darkSwatches}
            selected={paletteDark || paletteDefault.dark}
            onSelect={setPaletteDark}
          />

          {/* Accent — comes from the palette by default; override is opt-in. */}
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-fg-secondary">
              <input
                type="checkbox"
                checked={accentOverride}
                onChange={(e) => setAccentOverride(e.target.checked)}
              />
              Override accent
            </label>
            {accentOverride ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentLight}
                    onChange={(e) => setAccentLight(e.target.value)}
                    className="h-9 w-12 rounded border border-line bg-transparent"
                  />
                  <Field label="Light accent" value={accentLight} onChange={setAccentLight} />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentDark}
                    onChange={(e) => setAccentDark(e.target.value)}
                    className="h-9 w-12 rounded border border-line bg-transparent"
                  />
                  <Field label="Dark accent" value={accentDark} onChange={setAccentDark} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs text-fg-muted">
                <Swatch color={accents.light} label="Light" />
                <Swatch color={accents.dark} label="Dark" />
                <span>Matched to the palette</span>
              </div>
            )}
          </div>
        </Group>

        <Group title="Discipleship Track">
          <StepEditor steps={track} onChange={setTrack} />
        </Group>
        <Group title="Next Steps">
          <StepEditor steps={next} onChange={setNext} />
          <p className="mt-1 text-xs text-fg-muted">
            Tip: click a step&apos;s status to set the demo member&apos;s progress.
          </p>
        </Group>

        <Group title={editingSlug ? "Save changes" : "Create"}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full rounded-lg bg-surface-inverted px-4 py-2.5 text-sm font-semibold text-fg-inverted hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : editingSlug ? "Save changes" : "Create demo"}
          </button>
          <p className="mt-2 text-xs text-fg-muted">
            Writes <code className="text-fg-secondary">src/churches/data/{slug}.json</code>. Commit &amp; push to deploy.
          </p>
        </Group>
      </div>

      {/* ── Live preview ── */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="sticky top-0 z-[70] flex items-center justify-between border-b border-line bg-surface/80 px-4 py-2 backdrop-blur">
          <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">Live preview</span>
          <label className="flex items-center gap-2 text-xs text-fg-secondary">
            <input type="checkbox" checked={previewSignedIn} onChange={(e) => setPreviewSignedIn(e.target.checked)} />
            Signed in
          </label>
        </div>
        <DemoExperience
          key={String(previewSignedIn)}
          config={config}
          startSignedIn={previewSignedIn}
          embedded
          onTemplateChange={selectTemplate}
        />
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminInner />
    </Suspense>
  );
}

// ── Config building & merge ───────────────────────────────────────────────

function buildConfig(input: {
  slug: string;
  churchName: string;
  tagline: string;
  /** Per-mode accent overrides, or undefined to inherit the palette's accent. */
  accentLight: string | undefined;
  accentDark: string | undefined;
  /** The previewed/primary template (shown first). */
  template: string;
  /** The published set — which templates go live. */
  templates: string[];
  /** The signed-in demo member's first name. */
  memberName: string;
  paletteLight: string;
  paletteDark: string;
  logoUrl: string;
  welcomeLine: string;
  track: StepDraft[];
  next: StepDraft[];
}): ChurchConfig {
  const keyOf = (d: StepDraft, i: number, prefix: string) => d.key || slugify(d.label) || `${prefix}-${i}`;

  const toSteps = (drafts: StepDraft[], startOrder: number, prefix: string): PathwayStep[] =>
    drafts.map((d, i) => ({
      key: keyOf(d, i, prefix),
      label: d.label,
      description: d.description?.trim() || undefined,
      ctaLabel: d.ctaLabel?.trim() || undefined,
      meta: d.meta?.trim() || undefined,
      icon: d.icon,
      order: startOrder + i * 10,
    }));

  const trackSteps = toSteps(input.track, 10, "track");
  const nextSteps = toSteps(input.next, 10 + input.track.length * 10, "next");
  const memberSteps = [
    ...input.track.map((d, i) => ({ key: keyOf(d, i, "track"), status: d.status })),
    ...input.next.map((d, i) => ({ key: keyOf(d, i, "next"), status: d.status })),
  ];

  const palette =
    input.paletteLight || input.paletteDark
      ? { light: input.paletteLight || undefined, dark: input.paletteDark || undefined }
      : undefined;

  // Published templates in registry order; the primary must be one of them.
  const templates = Object.keys(TEMPLATES).filter((k) => input.templates.includes(k));
  const primary = templates.includes(input.template) ? input.template : templates[0] ?? input.template;

  return {
    slug: input.slug,
    churchName: input.churchName,
    tagline: input.tagline || undefined,
    logoUrl: input.logoUrl || undefined,
    brand:
      input.accentLight || input.accentDark
        ? { accentLight: input.accentLight, accentDark: input.accentDark }
        : undefined,
    template: primary,
    templates,
    palette,
    welcomeLine: input.welcomeLine || undefined,
    discipleshipTrack: trackSteps,
    nextSteps,
    demoMember: {
      ...DEMO_MEMBER,
      firstName: input.memberName.trim() || DEMO_MEMBER.firstName,
      steps: memberSteps,
    },
  };
}

/** Merge the form's config onto a loaded base so fields the form doesn't expose
 *  (per-step copy, themeOverrides, meta, …) survive an edit. */
function mergeConfig(base: Partial<ChurchConfig>, built: ChurchConfig): ChurchConfig {
  const byKey = (steps?: PathwayStep[]) => new Map((steps ?? []).map((s) => [s.key, s]));
  const baseTrack = byKey(base.discipleshipTrack);
  const baseNext = byKey(base.nextSteps);
  return {
    ...base,
    ...built,
    discipleshipTrack: built.discipleshipTrack.map((s) => ({ ...(baseTrack.get(s.key) ?? {}), ...s })),
    nextSteps: built.nextSteps.map((s) => ({ ...(baseNext.get(s.key) ?? {}), ...s })),
    demoMember: { ...base.demoMember, ...built.demoMember },
  };
}

// ── Small form primitives ─────────────────────────────────────────────────

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-5 w-5 rounded-full border border-line" style={{ backgroundColor: color }} aria-hidden />
      <span>
        {label} <span className="text-fg-secondary">{color}</span>
      </span>
    </span>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-xs text-fg-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-fg outline-none focus:border-line-hover"
      />
    </label>
  );
}

/** A small wireframe preview of a template's general layout, for the picker. */
function TemplateThumb({ templateKey }: { templateKey: string }) {
  if (templateKey === "warm-bento") {
    return (
      <div className="flex h-[64px] flex-col gap-1 p-1.5">
        <div className="h-1.5 w-full rounded-sm bg-fg/15" />
        <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-1">
          <div className="col-span-2 rounded-sm bg-fg/15" />
          <div className="rounded-sm bg-fg/30" />
          <div className="rounded-sm bg-fg/30" />
          <div className="col-span-2 rounded-sm bg-fg/15" />
        </div>
      </div>
    );
  }
  if (templateKey === "warm-guide") {
    return (
      <div className="flex h-[64px] flex-col gap-1 p-1.5">
        <div className="mx-auto h-1.5 w-1/2 rounded-sm bg-fg/15" />
        <div className="flex flex-1 gap-1">
          <div className="flex w-1/3 flex-col justify-center gap-1">
            <div className="h-1 w-full rounded-sm bg-fg/15" />
            <div className="h-1 w-full rounded-sm bg-fg/15" />
            <div className="h-1 w-full rounded-sm bg-fg/15" />
          </div>
          <div className="flex-1 rounded-sm bg-fg/30" />
        </div>
      </div>
    );
  }
  if (templateKey === "stream") {
    // Cinematic vertical story: a progress rail of dots beside stacked chapters.
    return (
      <div className="flex h-[64px] gap-2 p-1.5">
        <div className="flex w-2 flex-col items-center justify-between py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-fg/30" />
          <div className="h-1.5 w-1.5 rounded-full bg-fg/30" />
          <div className="h-1.5 w-1.5 rounded-full bg-fg/15" />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1.5">
          <div className="h-2 w-2/3 rounded-sm bg-fg/30" />
          <div className="h-1 w-full rounded-sm bg-fg/15" />
          <div className="h-1 w-5/6 rounded-sm bg-fg/15" />
        </div>
      </div>
    );
  }
  if (templateKey === "console") {
    // App workspace: a persistent sidebar of nav lines + a main canvas.
    return (
      <div className="flex h-[64px] gap-1 p-1.5">
        <div className="flex w-1/3 flex-col gap-1 rounded-sm bg-fg/10 p-1">
          <div className="h-1 w-full rounded-sm bg-fg/30" />
          <div className="h-1 w-3/4 rounded-sm bg-fg/15" />
          <div className="h-1 w-3/4 rounded-sm bg-fg/15" />
          <div className="mt-auto h-1 w-full rounded-sm bg-fg/15" />
        </div>
        <div className="flex-1 rounded-sm bg-fg/20" />
      </div>
    );
  }
  if (templateKey === "orbit") {
    // Radial constellation: a center core with nodes around it.
    return (
      <div className="relative flex h-[64px] items-center justify-center p-1.5">
        <div className="h-7 w-7 rounded-full bg-fg/30" />
        <div className="absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-fg/25" />
        <div className="absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-fg/20" />
        <div className="absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-fg/20" />
        <div className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-fg/20" />
      </div>
    );
  }
  // editorial (default): pathway list on the left, focal card on the right.
  return (
    <div className="flex h-[64px] flex-col gap-1 p-1.5">
      <div className="h-1.5 w-full rounded-sm bg-fg/15" />
      <div className="flex flex-1 gap-1">
        <div className="flex flex-1 flex-col justify-center gap-1">
          <div className="h-1 w-full rounded-sm bg-fg/15" />
          <div className="h-1 w-4/5 rounded-sm bg-fg/15" />
          <div className="h-1 w-5/6 rounded-sm bg-fg/15" />
        </div>
        <div className="w-2/5 rounded-sm bg-fg/30" />
      </div>
    </div>
  );
}

/** The checkmark badge shown on a selected template/palette tile. */
function SelectedBadge() {
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-fg text-[10px] font-bold leading-none text-fg-inverted shadow">
      ✓
    </span>
  );
}

/** A row of palette preview swatches for one mode — click to select. */
function PaletteRow({
  label,
  swatches,
  selected,
  onSelect,
}: {
  label: string;
  swatches: PaletteSwatch[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs text-fg-muted">{label}</span>
      <div className="grid grid-cols-5 gap-1.5">
        {swatches.map((s) => {
          const isSel = s.name === selected;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => onSelect(s.name)}
              title={s.name}
              className={`relative rounded-md border p-1 transition ${
                isSel ? "border-fg ring-1 ring-fg" : "border-line hover:border-line-hover"
              }`}
            >
              <div className="h-7 w-full overflow-hidden rounded" style={{ backgroundColor: s.bg }}>
                <div className="flex h-full items-center gap-1 px-1">
                  <span
                    className="h-3.5 w-3.5 rounded-[3px] border border-black/10"
                    style={{ backgroundColor: s.card }}
                  />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.accent }} />
                </div>
              </div>
              <div className="mt-0.5 truncate text-center text-[9.5px] capitalize text-fg-muted">{s.name}</div>
              {isSel && <SelectedBadge />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepEditor({ steps, onChange }: { steps: StepDraft[]; onChange: (s: StepDraft[]) => void }) {
  const update = (i: number, patch: Partial<StepDraft>) =>
    onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(steps.filter((_, j) => j !== i));
  const add = () => onChange([...steps, { label: "New step", icon: "star", status: "not-started" }]);
  const cycleStatus = (i: number) => {
    const cur = steps[i].status;
    update(i, { status: STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length] });
  };

  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface-raised p-2">
          <div className="flex items-center gap-2">
            <input
              value={s.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Step label"
              className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1 text-sm outline-none"
            />
            <button type="button" onClick={() => remove(i)} className="rounded px-2 py-1 text-xs text-fg-muted hover:text-error">
              ✕
            </button>
          </div>
          <textarea
            value={s.description ?? ""}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder="Description — the paragraph shown in this step's card"
            rows={2}
            className="mt-1.5 w-full resize-y rounded border border-line bg-surface px-2 py-1 text-xs leading-snug outline-none"
          />
          <div className="mt-1.5 flex gap-2">
            <input
              value={s.ctaLabel ?? ""}
              onChange={(e) => update(i, { ctaLabel: e.target.value })}
              placeholder="Button label"
              className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1 text-xs outline-none"
            />
            <input
              value={s.meta ?? ""}
              onChange={(e) => update(i, { meta: e.target.value })}
              placeholder="Meta line"
              className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1 text-xs outline-none"
            />
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <select
              value={s.icon}
              onChange={(e) => update(i, { icon: e.target.value as IconName })}
              className="rounded border border-line bg-surface px-2 py-1 text-xs outline-none"
            >
              {ICON_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => cycleStatus(i)}
              className="rounded border border-line px-2 py-1 text-xs hover:bg-surface-hover"
            >
              {STATUS_LABEL[s.status]}
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full rounded-lg border border-dashed border-line py-1.5 text-xs text-fg-muted hover:bg-surface-raised"
      >
        + Add step
      </button>
    </div>
  );
}
