import { notFound } from "next/navigation";
import { getChurch } from "@/churches";
import { getTemplateEntry } from "@/components/templates";
import DemoChrome from "@/components/DemoChrome";

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

  const { component: Template, selfChrome } = getTemplateEntry(config.template);

  return (
    <DemoChrome config={config} showMemberArea={!selfChrome}>
      <Template config={config} />
    </DemoChrome>
  );
}
