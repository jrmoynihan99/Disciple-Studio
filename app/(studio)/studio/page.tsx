"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Trash2, Plus, Copy, Check } from "lucide-react";

type Row = {
  slug: string;
  churchName: string;
  template: string;
  accent: string | null;
};

/**
 * Internal index of all demos with Preview / Edit / Delete. Client-rendered: it
 * fetches the list from the API (which reads the JSON registry), so it always
 * reflects the current files. Not linked publicly; excluded from indexing.
 */
export default function Home() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/churches")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/c/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
      return;
    }
    setCopied(slug);
    setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1500);
  }

  async function del(slug: string, name: string) {
    if (!confirm(`Delete the demo for "${name}"? This permanently removes it.`))
      return;
    setBusy(slug);
    try {
      const res = await fetch(`/api/churches/${slug}`, { method: "DELETE" });
      if (!res.ok) alert("Delete failed. Please try again.");
    } finally {
      setBusy(null);
      load();
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-muted">
        Disciple Studio
      </p>
      <div className="mt-2 flex items-end justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-fg">
          Church demos
        </h1>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-inverted px-3 py-2 text-sm font-medium text-fg-inverted hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New demo
        </Link>
      </div>

      {rows === null ? (
        <p className="mt-8 text-fg-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-fg-muted">
          No demos yet.{" "}
          <Link href="/admin" className="text-brand hover:underline">
            Create one →
          </Link>
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {rows.map((c) => (
            <li
              key={c.slug}
              className="flex items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {c.accent && (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: c.accent }}
                      aria-hidden
                    />
                  )}
                  <span className="truncate font-medium text-fg">
                    {c.churchName}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-sm text-fg-muted">
                  /c/{c.slug}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => copyLink(c.slug)}
                  title="Copy the shareable demo link"
                  className="inline-flex h-10 w-10 items-center justify-center gap-1 rounded-lg text-sm text-fg-secondary hover:bg-surface-raised sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
                >
                  {copied === c.slug ? (
                    <>
                      <Check className="h-4 w-4 text-success" />
                      <span className="hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">Copy link</span>
                    </>
                  )}
                </button>
                <a
                  href={`/c/${c.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Preview"
                  className="inline-flex h-10 w-10 items-center justify-center gap-1 rounded-lg text-sm text-fg-secondary hover:bg-surface-raised sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Preview</span>
                </a>
                <Link
                  href={`/admin?slug=${c.slug}`}
                  title="Edit"
                  className="inline-flex h-10 w-10 items-center justify-center gap-1 rounded-lg text-sm text-fg-secondary hover:bg-surface-raised sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Link>
                <button
                  onClick={() => del(c.slug, c.churchName)}
                  disabled={busy === c.slug}
                  title="Delete"
                  className="inline-flex h-10 w-10 items-center justify-center gap-1 rounded-lg text-sm text-fg-secondary hover:bg-surface-raised hover:text-error disabled:opacity-50 sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
