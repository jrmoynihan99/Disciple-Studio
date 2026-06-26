"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChurchConfig, IconName, PathwayStep, StepStatus } from "@/lib/types";
import { ICON_NAMES } from "@/lib/icons";
import { getTemplateEntry, TEMPLATES } from "@/components/templates";
import { listPalettes } from "@/lib/themes";
import DemoChrome from "@/components/DemoChrome";

/**
 * Local church builder + editor. Fill the form, watch the live preview, then
 * Save — which writes `src/churches/data/<slug>.json` via the API. Open with
 * `?slug=<slug>` to edit an existing demo (its file loads into the form).
 *
 * Editing preserves fields the form doesn't expose (welcome line copy isn't
 * lost, etc.) by merging the form output onto the loaded config — see
 * `mergeConfig`.
 */

type StepDraft = { key?: string; label: string; icon: IconName; status: StepStatus };

const STATUS_CYCLE: StepStatus[] = ["not-started", "in-progress", "complete"];
const STATUS_LABEL: Record<StepStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  complete: "Complete",
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

const DEFAULT_TRACK: StepDraft[] = [
  { label: "Attend a Sunday gathering", icon: "church", status: "complete" },
  { label: "Get baptized", icon: "droplets", status: "complete" },
  { label: "Join a community group", icon: "users", status: "in-progress" },
  { label: "Take the membership class", icon: "heart", status: "not-started" },
];
const DEFAULT_NEXT: StepDraft[] = [
  { label: "Find a place to serve", icon: "hand-heart", status: "not-started" },
  { label: "Set up recurring giving", icon: "sparkles", status: "not-started" },
];

function AdminInner() {
  const router = useRouter();
  const editingSlug = useSearchParams().get("slug");

  const [churchName, setChurchName] = useState("Grace Community Church");
  const [suffix, setSuffix] = useState("a7f3c1");
  const [tagline, setTagline] = useState("Knowing God. Making Him known.");
  const [accent, setAccent] = useState("#8a3441");
  const [template, setTemplate] = useState("editorial");
  const [paletteLight, setPaletteLight] = useState("");
  const [paletteDark, setPaletteDark] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [welcomeLine, setWelcomeLine] = useState(
    "You're a few steps into a life rooted in this church. Here's the next one.",
  );
  const [firstName, setFirstName] = useState("Sarah");
  const [lastName, setLastName] = useState("Thompson");
  const [email, setEmail] = useState("sarah.t@example.com");
  const [campus, setCampus] = useState("Downtown");
  const [memberSince, setMemberSince] = useState("Member since 2023");
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
        setAccent(c.brand?.accent ?? "#8a3441");
        setTemplate(c.template);
        setPaletteLight(c.palette?.light ?? "");
        setPaletteDark(c.palette?.dark ?? "");
        setLogoUrl(c.logoUrl ?? "");
        setWelcomeLine(c.welcomeLine ?? "");
        setFirstName(c.demoMember.firstName);
        setLastName(c.demoMember.lastName);
        setEmail(c.demoMember.email);
        setCampus(c.demoMember.campus ?? "");
        setMemberSince(c.demoMember.memberSince ?? "");
        const statusByKey = new Map(c.demoMember.steps.map((s) => [s.key, s.status]));
        const toDrafts = (steps: PathwayStep[]): StepDraft[] =>
          steps.map((s) => ({
            key: s.key,
            label: s.label,
            icon: (s.icon ?? "star") as IconName,
            status: statusByKey.get(s.key) ?? "not-started",
          }));
        setTrack(toDrafts(c.discipleshipTrack));
        setNext(toDrafts(c.nextSteps));
      })
      .catch(() => alert("Could not load that demo."));
  }, [editingSlug]);

  const baseSlug = slugify(churchName) || "church";
  // In edit mode the slug is locked to the loaded file (rename = new file).
  const slug = editingSlug ?? `${baseSlug}-${suffix}`;

  const palettes = listPalettes(template);

  const config = useMemo<ChurchConfig>(
    () =>
      buildConfig({
        slug, churchName, tagline, accent, template, paletteLight, paletteDark,
        logoUrl, welcomeLine,
        member: { firstName, lastName, email, campus, memberSince },
        track, next,
      }),
    [slug, churchName, tagline, accent, template, paletteLight, paletteDark, logoUrl, welcomeLine, firstName, lastName, email, campus, memberSince, track, next],
  );

  const { component: Template, selfChrome } = getTemplateEntry(config.template);

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
          {!editingSlug && (
            <div className="flex items-end gap-2">
              <Field label="Slug suffix" value={suffix} onChange={setSuffix} />
              <button
                type="button"
                onClick={() => setSuffix(randomSuffix())}
                className="mb-0.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-raised"
              >
                Randomize
              </button>
            </div>
          )}
          <Field label="Tagline" value={tagline} onChange={setTagline} />
        </Group>

        <Group title="Branding">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-9 w-12 rounded border border-line bg-transparent"
            />
            <Field label="Accent" value={accent} onChange={setAccent} />
          </div>
          <Select
            label="Template"
            value={template}
            onChange={(v) => {
              setTemplate(v);
              setPaletteLight("");
              setPaletteDark("");
            }}
            options={Object.keys(TEMPLATES)}
          />
          <div className="flex gap-2">
            <Select label="Light palette" value={paletteLight} onChange={setPaletteLight} options={["", ...palettes.light]} defaultLabel="Default" />
            <Select label="Dark palette" value={paletteDark} onChange={setPaletteDark} options={["", ...palettes.dark]} defaultLabel="Default" />
          </div>
          <Field label="Logo URL (optional)" value={logoUrl} onChange={setLogoUrl} />
        </Group>

        <Group title="Greeting">
          <Field label="Welcome line" value={welcomeLine} onChange={setWelcomeLine} />
        </Group>

        <Group title="Discipleship Track">
          <StepEditor steps={track} onChange={setTrack} />
        </Group>
        <Group title="Next Steps">
          <StepEditor steps={next} onChange={setNext} />
        </Group>

        <Group title="Demo member">
          <div className="flex gap-2">
            <Field label="First" value={firstName} onChange={setFirstName} />
            <Field label="Last" value={lastName} onChange={setLastName} />
          </div>
          <Field label="Email" value={email} onChange={setEmail} />
          <div className="flex gap-2">
            <Field label="Campus" value={campus} onChange={setCampus} />
            <Field label="Member since" value={memberSince} onChange={setMemberSince} />
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            Tip: click a step&apos;s status above to set their progress.
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
        <DemoChrome
          key={String(previewSignedIn)}
          config={config}
          startSignedIn={previewSignedIn}
          showMemberArea={!selfChrome}
        >
          <Template config={config} />
        </DemoChrome>
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
  accent: string;
  template: string;
  paletteLight: string;
  paletteDark: string;
  logoUrl: string;
  welcomeLine: string;
  member: { firstName: string; lastName: string; email: string; campus: string; memberSince: string };
  track: StepDraft[];
  next: StepDraft[];
}): ChurchConfig {
  const keyOf = (d: StepDraft, i: number, prefix: string) => d.key || slugify(d.label) || `${prefix}-${i}`;

  const toSteps = (drafts: StepDraft[], startOrder: number, prefix: string): PathwayStep[] =>
    drafts.map((d, i) => ({ key: keyOf(d, i, prefix), label: d.label, icon: d.icon, order: startOrder + i * 10 }));

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

  return {
    slug: input.slug,
    churchName: input.churchName,
    tagline: input.tagline || undefined,
    logoUrl: input.logoUrl || undefined,
    brand: { accent: input.accent },
    template: input.template,
    palette,
    welcomeLine: input.welcomeLine || undefined,
    discipleshipTrack: trackSteps,
    nextSteps,
    demoMember: {
      firstName: input.member.firstName,
      lastName: input.member.lastName,
      email: input.member.email,
      campus: input.member.campus || undefined,
      memberSince: input.member.memberSince || undefined,
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

function Select({
  label,
  value,
  onChange,
  options,
  defaultLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  defaultLabel?: string;
}) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-xs text-fg-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-fg outline-none focus:border-line-hover"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface text-fg">
            {o === "" ? (defaultLabel ?? "—") : o}
          </option>
        ))}
      </select>
    </label>
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
              className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1 text-sm outline-none"
            />
            <button type="button" onClick={() => remove(i)} className="rounded px-2 py-1 text-xs text-fg-muted hover:text-error">
              ✕
            </button>
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
