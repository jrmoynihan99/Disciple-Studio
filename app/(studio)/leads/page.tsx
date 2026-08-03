import { LeadConsole } from "./_components/LeadConsole";

/**
 * The Lead Console.
 *
 * A thin server shell. It passes NO DATA: the index travels over `fetch`
 * through `/api/leads/index` so it can be cached, verified against a publish id,
 * and — at 14,400 rows — kept out of the HTML document entirely.
 */
export default function LeadsPage() {
  return <LeadConsole />;
}
