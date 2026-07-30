# Archive

Nothing in here is part of the site. The leading underscore makes this a
Next.js [private folder][1] — the routing system skips it and every folder
under it, so none of these files become a page, and nothing imports them, so
none of them are compiled into a bundle either. They are kept only so the work
is readable without digging through git history.

[1]: https://nextjs.org/docs/app/getting-started/project-structure#private-folders

## What's here

| Folder           | What it was                                                     |
| ---------------- | --------------------------------------------------------------- |
| `home/`          | The original marketing home page, previously `app/page.tsx` (`/`) |
| `about-us/`      | Its about page, previously `/about-us`                            |
| `book/`          | Its booking page, previously `/book`                              |
| `components/`    | The sections those three pages were built from                    |
| `fuel-variants/` | Two visuals the ChMS-sync section auditioned and lost             |

The current site is `app/(site)/` — the pages that used to live under `/v3`.
It took over `/`, `/about-us` and `/book` from the pages archived here, and
`next.config.ts` redirects the old `/v2` and `/v3` URLs to it.

## Caveats

- These files are still type-checked and linted, so they have to keep
  compiling even though they never ship. If one starts failing a build and
  it isn't worth fixing, delete it — git has it.
- `components/ui.tsx` is **not** here. The archived pages and the live site
  both use it, so it moved to the shared kit at `components/ui.tsx`.
- The two fuel variants import from `@/app/(site)/...`, so they follow the
  live site's components. If those move again, these will break — see above.
