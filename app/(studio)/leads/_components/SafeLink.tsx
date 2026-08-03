import { safeUrl } from "@/lib/leads/engine/url";

/**
 * THE ONLY PLACE a data-derived href is rendered.
 *
 * Every URL in this dataset is church-controlled — scraped hrefs, app-store
 * links, evidence source URLs, logo URLs. React escapes text content but will
 * happily render `href="javascript:..."` as a live click target.
 *
 * A URL that fails the scheme check renders as INERT TEXT, not as a dead link
 * and not as nothing: the user should still be able to see what we hold.
 */
export function SafeLink({
  href,
  children,
  className,
  title,
  stopPropagation,
}: {
  href: string | null | undefined;
  children?: React.ReactNode;
  className?: string;
  title?: string;
  /** Rows are clickable; a link inside one must not also open the dossier. */
  stopPropagation?: boolean;
}) {
  const safe = safeUrl(href);
  const body = children ?? href ?? "";

  if (!safe) {
    return (
      <span className={className} title={title} data-unsafe-url="true">
        {body}
      </span>
    );
  }

  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      {body}
    </a>
  );
}
