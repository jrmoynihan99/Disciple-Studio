"use client";

import { createContext, useContext } from "react";

/**
 * IS THIS BATCH STILL EDITABLE?
 *
 * An exported batch is history. Its demos are built, its `/c/<slug>` links may
 * already be in a church's inbox, and nothing typed here afterwards can reach
 * them — so an edit to a sent batch does not correct anything, it just quietly
 * rewrites the record of what was sent. That is the opposite of what a page whose
 * entire purpose is an accurate account of what a person approved should allow.
 *
 * A CONTEXT RATHER THAN A PROP, and the reason is the failure mode. A review card
 * renders roughly thirty editable fields, five removal controls and three add
 * forms; threading `readOnly` to each of them means about forty call sites where
 * forgetting one leaves a live control on a frozen batch — and a live control on a
 * frozen batch looks exactly like a working one until somebody uses it. Read once,
 * in `EditableText` and in the three places that draw a destructive control, it
 * cannot be forgotten at a call site because there is no call site.
 *
 * DEFAULTS TO FALSE, deliberately: a component mounted outside a provider — the
 * `/leads/audit` probes, for instance — is editable, because "collecting" is the
 * normal state of a batch and freezing one is the exception that has to be asked
 * for.
 */
const ReadOnlyContext = createContext(false);

export function ReadOnlyProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <ReadOnlyContext.Provider value={value}>{children}</ReadOnlyContext.Provider>;
}

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}
