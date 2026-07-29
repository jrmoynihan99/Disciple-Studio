import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getChurch } from "@/churches";
import DemoExperience from "@/components/DemoExperience";

/**
 * A single church demo at /c/<slug>.
 *
 * Rendered dynamically and read live from the Blob store so a just-created or
 * just-edited demo is served immediately, with no rebuild.
 *
 * Isolation: a demo renders only if its blob exists (getChurch → notFound
 * otherwise); a guessed slug with no blob still 404s.
 */
export const dynamic = "force-dynamic";

/** Vercel Blob is eventually consistent: a demo whose blob was just created — or
 *  deleted-then-recreated during a re-import — can read back as missing for a few
 *  seconds. Rather than 404 a demo that really exists (e.g. a preview clicked the
 *  instant an import finishes), we wait the window out. This adds latency ONLY on
 *  a miss; a real visitor hits the blob on the first read. */
const RETRY_ATTEMPTS = 8;
const RETRY_DELAY_MS = 700;

export default async function ChurchDemoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let config = await getChurch(slug);
  for (let i = 0; !config && i < RETRY_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    config = await getChurch(slug);
  }
  if (!config) notFound();

  // The pre-screen shows once per browser; the server reads the cookie so return
  // visits never render it (no flash).
  const introSeen = (await cookies()).has(`ds_intro_${slug}`);

  return <DemoExperience config={config} introSeen={introSeen} />;
}
