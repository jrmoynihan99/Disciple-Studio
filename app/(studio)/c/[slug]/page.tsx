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

export default async function ChurchDemoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = await getChurch(slug);
  if (!config) notFound();

  // The pre-screen shows once per browser; the server reads the cookie so return
  // visits never render it (no flash).
  const introSeen = (await cookies()).has(`ds_intro_${slug}`);

  return <DemoExperience config={config} introSeen={introSeen} />;
}
