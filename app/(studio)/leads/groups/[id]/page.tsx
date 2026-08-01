import { GroupReview } from "../_components/GroupReview";

/**
 * One export group, opened for review.
 *
 * Gated by `proxy.ts` through the existing `/leads/:path*` matcher, and it
 * inherits `data-lead-root` plus the pre-paint theme script from
 * `app/(studio)/leads/layout.tsx` — so the tokens, fonts and scrollbars are all
 * the console's without importing anything.
 */

export const metadata = { title: "Export group · Lead Console" };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupReview id={id} />;
}
