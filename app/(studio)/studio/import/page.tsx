"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderUp, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { GENERIC_DEMO_URL } from "@/lib/config";
import type { GroupRow } from "@/lib/groups";

/** How many churches to import at once — small on purpose to spare the Blob store. */
const BATCH_SIZE = 3;

type Phase = "idle" | "running" | "done" | "error";

interface Progress {
  total: number;
  done: number;
  ok: number;
  skipped: string[];
  failed: string[];
}

/** Basename of a path, e.g. "logos/100079.png" → "100079.png". */
function basename(p: string): string {
  return p.split("/").pop() ?? p;
}

export default function ImportPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [groupName, setGroupName] = useState("");
  const [genericLink, setGenericLink] = useState(GENERIC_DEMO_URL);
  const [limit, setLimit] = useState<string>(""); // blank = all; set e.g. 3 to test
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string>("");
  const [progress, setProgress] = useState<Progress>({ total: 0, done: 0, ok: 0, skipped: [], failed: [] });

  // Locate the JSON + build a basename→File map of the logos folder.
  const { jsonFile, logoMap, folderName } = useMemo(() => {
    let jsonFile: File | null = null;
    const logoMap = new Map<string, File>();
    let folderName = "";
    for (const f of files) {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      if (!folderName && rel.includes("/")) folderName = rel.split("/")[0];
      if (basename(rel).toLowerCase() === "next_steps.json") jsonFile = f;
      else if (rel.includes("/logos/")) logoMap.set(basename(rel), f);
    }
    return { jsonFile, logoMap, folderName };
  }, [files]);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files ?? []));
    setPhase("idle");
    setMessage("");
  }, []);

  const run = useCallback(async () => {
    if (!jsonFile) {
      setPhase("error");
      setMessage("No next_steps.json found in the selected folder.");
      return;
    }
    if (!groupName.trim()) {
      setPhase("error");
      setMessage("Give this import a group name first.");
      return;
    }

    let churches: Array<Record<string, unknown>>;
    try {
      const parsed = JSON.parse(await jsonFile.text());
      if (!Array.isArray(parsed)) throw new Error("not an array");
      churches = parsed;
    } catch {
      setPhase("error");
      setMessage("next_steps.json could not be parsed as a JSON array.");
      return;
    }

    const lim = parseInt(limit, 10);
    if (!Number.isNaN(lim) && lim > 0) churches = churches.slice(0, lim);

    setPhase("running");
    setMessage("");
    const rows: GroupRow[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];
    let done = 0;
    setProgress({ total: churches.length, done: 0, ok: 0, skipped: [], failed: [] });

    const importOne = async (church: Record<string, unknown>) => {
      const fd = new FormData();
      fd.append("church", JSON.stringify(church));
      const localPath = typeof church.logo_local === "string" ? church.logo_local : "";
      const logo = localPath ? logoMap.get(basename(localPath)) : undefined;
      if (logo) fd.append("logo", logo);
      const title = (church.church_title as string) || "(unnamed)";
      try {
        const res = await fetch("/api/import", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) failed.push(title);
        else if (data.skipped) skipped.push(title);
        else if (data.row) rows.push(data.row as GroupRow);
      } catch {
        failed.push(title);
      } finally {
        done++;
        setProgress({ total: churches.length, done, ok: rows.length, skipped: [...skipped], failed: [...failed] });
      }
    };

    // Process in batches of BATCH_SIZE (bounded concurrency).
    for (let i = 0; i < churches.length; i += BATCH_SIZE) {
      await Promise.all(churches.slice(i, i + BATCH_SIZE).map(importOne));
    }

    if (rows.length === 0) {
      setPhase("error");
      setMessage("No demos were created. Check the folder contents and try again.");
      return;
    }

    // Persist the group, then jump to its page.
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim(), genericLink: genericLink.trim(), rows }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error("save failed");
      setPhase("done");
      router.push(`/studio/g/${data.id}`);
    } catch {
      setPhase("error");
      setMessage("Demos were created, but saving the group failed. They still exist under Church demos.");
    }
  }, [jsonFile, logoMap, groupName, genericLink, limit, router]);

  const running = phase === "running";
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Church demos
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-fg">Import a folder</h1>
      <p className="mt-2 text-fg-muted">
        Pick a folder containing <code className="rounded bg-surface-raised px-1">next_steps.json</code> and a{" "}
        <code className="rounded bg-surface-raised px-1">logos/</code> directory. Each church becomes a demo, generated{" "}
        {BATCH_SIZE} at a time. When it finishes you get a group with every demo and a downloadable spreadsheet.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">Folder</label>
          <input
            ref={inputRef}
            type="file"
            onChange={onPick}
            disabled={running}
            // webkitdirectory isn't in React's types; set via ref-less attributes.
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            className="block w-full text-sm text-fg-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-surface-inverted file:px-3 file:py-2 file:text-sm file:font-medium file:text-fg-inverted hover:file:opacity-90"
          />
          {files.length > 0 && (
            <p className="mt-1.5 text-sm text-fg-muted">
              {folderName && <span className="font-medium text-fg">{folderName}/</span>} — {files.length} files,{" "}
              {logoMap.size} logos, {jsonFile ? "next_steps.json found" : "no next_steps.json"}.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">Group name</label>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={running}
            placeholder="Pilot 100 — first pass"
            className="block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">Generic demo link</label>
          <input
            value={genericLink}
            onChange={(e) => setGenericLink(e.target.value)}
            disabled={running}
            className="block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand"
          />
          <p className="mt-1 text-xs text-fg-muted">Included in every row of the output spreadsheet.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">
            Limit <span className="font-normal text-fg-muted">(optional — leave blank for all; set 3 to test)</span>
          </label>
          <input
            value={limit}
            onChange={(e) => setLimit(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={running}
            inputMode="numeric"
            placeholder="all"
            className="block w-28 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand"
          />
        </div>

        <button
          onClick={run}
          disabled={running || files.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-surface-inverted px-4 py-2.5 text-sm font-medium text-fg-inverted hover:opacity-90 disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderUp className="h-4 w-4" />}
          {running ? "Generating…" : "Generate demos"}
        </button>
      </div>

      {(running || phase === "done" || progress.done > 0) && (
        <div className="mt-8 rounded-2xl border border-line p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-fg">
              {progress.done} / {progress.total} processed
            </span>
            <span className="text-fg-muted">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-raised">
            <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="h-4 w-4" /> {progress.ok} created
            </span>
            {progress.skipped.length > 0 && <span>{progress.skipped.length} skipped (no steps)</span>}
            {progress.failed.length > 0 && (
              <span className="inline-flex items-center gap-1 text-error">
                <AlertTriangle className="h-4 w-4" /> {progress.failed.length} failed
              </span>
            )}
          </div>
          {progress.failed.length > 0 && (
            <p className="mt-2 text-xs text-fg-muted">Failed: {progress.failed.join(", ")}</p>
          )}
        </div>
      )}

      {message && (
        <p className={`mt-4 text-sm ${phase === "error" ? "text-error" : "text-fg-muted"}`}>{message}</p>
      )}
    </main>
  );
}
