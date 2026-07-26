"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil, Download, Link2, Trash2, Loader2 } from "lucide-react";
import type { Group } from "@/lib/groups";

/** Quote a CSV field per RFC 4180 (wrap + double interior quotes when needed). */
function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function GroupPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null | undefined>(undefined); // undefined = loading
  const [busy, setBusy] = useState<string | null>(null); // slug being deleted
  const [deletingGroup, setDeletingGroup] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setGroup)
      .catch(() => setGroup(null));
  }, [id]);

  async function delDemo(slug: string, name: string) {
    if (!confirm(`Delete the demo for "${name}"? This permanently removes it and its row from this group.`))
      return;
    setBusy(slug);
    try {
      const res = await fetch(`/api/groups/${id}/demos/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Delete failed. Please try again.");
        return;
      }
      setGroup((g) => (g ? { ...g, rows: g.rows.filter((r) => r.slug !== slug) } : g));
    } finally {
      setBusy(null);
    }
  }

  async function delGroup() {
    if (!group) return;
    if (
      !confirm(
        `Delete the group "${group.name}" and all ${group.rows.length} of its demos? This can't be undone.`,
      )
    )
      return;
    setDeletingGroup(true);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Delete failed. Please try again.");
        setDeletingGroup(false);
        return;
      }
      router.push("/studio");
    } catch {
      alert("Delete failed. Please try again.");
      setDeletingGroup(false);
    }
  }

  function downloadCsv() {
    if (!group) return;
    const origin = window.location.origin;
    const header = ["church_name", "contact_name", "contact_email", "generic_demo_link", "specific_demo_link"];
    const lines = [header.join(",")];
    for (const r of group.rows) {
      lines.push(
        [r.churchName, r.contactName, r.contactEmail, group.genericLink, origin + r.demoPath]
          .map(csvCell)
          .join(","),
      );
    }
    // UTF-8 BOM so Excel reads accents correctly.
    const blob = new Blob(["﻿" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${group.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Church demos
      </Link>

      {group === undefined ? (
        <p className="mt-8 text-fg-muted">Loading…</p>
      ) : group === null ? (
        <p className="mt-8 text-fg-muted">Group not found.</p>
      ) : (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-muted">Import group</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-fg">{group.name}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={downloadCsv}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-inverted px-3 py-2 text-sm font-medium text-fg-inverted hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download spreadsheet
              </button>
              <button
                onClick={delGroup}
                disabled={deletingGroup}
                title="Delete this group and all its demos"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-fg-secondary hover:border-error hover:text-error disabled:opacity-50"
              >
                {deletingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete group
              </button>
            </div>
          </div>

          {group.genericLink && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-fg-muted">
              <Link2 className="h-4 w-4" /> Generic demo link:{" "}
              <a href={group.genericLink} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                {group.genericLink}
              </a>
            </p>
          )}

          <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {group.rows.map((r) => (
              <li key={r.slug} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="truncate font-medium text-fg">{r.churchName}</div>
                  <div className="mt-0.5 truncate text-sm text-fg-muted">
                    /c/{r.slug}
                    {r.contactEmail && <span> · {r.contactEmail}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={r.demoPath}
                    target="_blank"
                    rel="noreferrer"
                    title="Preview"
                    className="inline-flex h-10 w-10 items-center justify-center gap-1 rounded-lg text-sm text-fg-secondary hover:bg-surface-raised sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden sm:inline">Preview</span>
                  </a>
                  <Link
                    href={`/admin?slug=${r.slug}`}
                    title="Edit"
                    className="inline-flex h-10 w-10 items-center justify-center gap-1 rounded-lg text-sm text-fg-secondary hover:bg-surface-raised sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>
                  <button
                    onClick={() => delDemo(r.slug, r.churchName)}
                    disabled={busy === r.slug}
                    title="Delete"
                    className="inline-flex h-10 w-10 items-center justify-center gap-1 rounded-lg text-sm text-fg-secondary hover:bg-surface-raised hover:text-error disabled:opacity-50 sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
                  >
                    {busy === r.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
