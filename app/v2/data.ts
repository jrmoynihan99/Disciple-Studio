const DEMO_URL =
  "https://aletheia-website-seven.vercel.app/demo?k=a557d77fe749fddba7b92e37";

export const V2 = {
  brand: "disciple.studio",
  demoUrl: DEMO_URL,

  hero: {
    kicker: "A studio for the local church",
    title: "Custom church websites built by disciples,",
    titleAccent: " to disciple.",
    sub: "We’re Jason and Arjun. We met at our church, came to faith together, and now serve the kingdom by building church websites that help people find and follow Jesus.",
    hook: "It all started when our pastor asked for a better website",
    primary: "Talk With Us",
    secondary: "See our latest work",
  },

  nav: {
    work: { label: "Our Latest Work", href: DEMO_URL },
    talk: { label: "Talk With Us", href: "/book" },
  },

  demos: {
    site: {
      note: "don't take my word for it",
      label: "Browse the site we built",
      href: DEMO_URL,
    },
    cms: {
      note: "take a peek inside",
      label: "Tour the CMS — view-only",
      href: "#",
    },
    member: {
      note: "the part we're proudest of",
      label: "Demo the member experience",
      href: DEMO_URL,
    },
  },

  discipleship: {
    tabs: { before: "Any visitor", after: "Sarah, signed in" },
    beats: [
      {
        n: "1",
        k: "They defined the pathway",
        v: "Baptism, community group, discipleship classes, serving — what our church does to help people follow Jesus.",
      },
      {
        n: "2",
        k: "We connected their data",
        v: "Planning Center & CCB — the site reads where each person actually is, automatically synced to the member login.",
      },
      {
        n: "3",
        k: "Every member sees one next step",
        v: "Not a generic homepage. Their group, their progress, and the single next thing to do — every time they visit.",
      },
    ],
  },

  showcase: {
    eyebrow: "conclusion",
    title: "The finished product",
    sub: "A full ground-up website and content studio, connected to their church management system. Check it out below.",
    church: "Aletheia Church",
    location: "Built ground-up · 2025",
    url: DEMO_URL,
    urlLabel: "aletheia.org",
    visit: "Visit the live site",
    note: "go see it for yourself",
  },

  chapters: [
    {
      n: "01",
      title: "The ask",
      paras: [
        "Our pastor asked for a website that looked better and worked better. That was the whole brief. I (Jason) write software for a living, so I said I'd look into it.",
        "I thought I was signing up for a redesign. I was wrong — in the best way possible.",
      ],
    },
    {
      n: "02",
      title: "Templates couldn't get us there",
      paras: [
        "I started where anyone would: the templates. The ones inside the church software we already had (Ekklesia 360), and the ones on every platform I could find. I looked through a lot of them.",
        "None came close — some in modern design yes, but none in functionality, and none with flexibility I wanted for our church. The site I wanted didn't exist as a template. So I built it from scratch.",
      ],
    },
    {
      n: "03",
      title: "Which meant building a CMS",
      paras: [
        "A hand-built site needs something to power it — and the old CMS was everything I was trying to leave behind. Bloated menus, mystery settings, staff who quietly dreaded touching it.",
        "So I built a streamlined, clean CMS just for our church. Since I built the site, I knew what needed editing. Exactly what staff needed, nothing they didn't. Edits in seconds, new pages in minutes — and new landing pages whenever they want them.",
      ],
    },
    {
      n: "04",
      title: "Two systems that weren't talking",
      paras: [
        "Then I noticed something. The church already had a real system of record — in our case, Church Community Builder. Every member, group, event, and registration already lived there.",
        "And yet staff re-typed all of it into the website, by hand. Two systems, double the work, and a site that was always a little out of sync.",
        "So I built a bridge: a custom integration that made CCB the single source of truth. Events, groups, and registrations now flow to the website automatically. Staff enter things once — where they already enter them — and the site keeps itself current.",
        "Nobody “updates the website” anymore. It just stays right.",
      ],
    },
    {
      n: "05",
      title: "The (best) part I didn't see coming",
      paras: [
        "A ChMS quietly holds each person's whole journey — baptism, classes, groups, serving. So I added a member login to the website that surfaces it.",
        "Now when someone signs in, they see themselves: where they've been, and exactly what their next step is. A website that actually disciples people, sending them through the discipleship track a church had already built. That's when I realized this was the most powerful thing I had to offer a church.",
        "Below is the general idea. Click the button below for a live demo on the actual build!",
      ],
    },
  ],

  receipts: {
    site: {
      tag: "For your church",
      title: "A custom site, designed from scratch",
      points: [
        "Nails your branding — no template ceiling",
        "Fast and modern on every device",
        "Room to grow for years",
      ],
    },
    cms: {
      tag: "For your church",
      title: "A clean CMS your staff will enjoy",
      points: [
        "Exactly what your staff needs, nothing more",
        "Edits in seconds, new pages in minutes",
        "No bloated builder, no code",
      ],
    },
    sync: {
      tag: "For your church",
      title: "A custom integration with whatever you run",
      points: [
        "Planning Center, Breeze, CCB, Rock RMS…",
        "Enter events and groups once",
        "The site keeps itself current",
      ],
    },
    login: {
      tag: "For your church",
      title: "Member login with personalized next steps",
      points: [
        "Secure member sign-in",
        "Your discipleship path, surfaced",
        "Every member sees their next step",
      ],
    },
  },

  mirror: {
    kicker: "does any of this sound familiar?",
    lines: [
      "Your site runs on a template you've outgrown.",
      "Someone on your staff types every event twice.",
      "Your members all see the same generic page.",
    ],
    was: "that was us, a year ago.",
    inputLabel: "now — write your church's name here:",
    placeholder: "Grace Chapel",
    note: "now scroll back up to chapter five — the member portal is already wearing your name ↑",
  },

  pricing: {
    eyebrow: "How we work",
    title: "One build. One partnership.",
    sub: "One project fee covers the design and build, and the site is yours. After launch, we work with you monthly: direct access to the people who built your site, whenever you need us. We'd love to come alongside your team and make sure the whole system keeps working great for you.",
    note: "We'll walk through exact pricing together on the call — no surprises.",
    build: {
      label: "The build",
      note: "one project fee",
      rows: [
        ["Custom design & build", "Included"],
        ["Tailored content studio (CMS)", "Included"],
        ["Church software integration", "Included"],
        ["Member login & discipleship steps", "Included"],
      ] as [string, string][],
    },
    partnership: {
      label: "The partnership",
      note: "monthly",
      rows: [
        ["Direct access to us — call, text, email", "Always"],
        ["Fixes, updates & new pages", "Covered"],
        ["Hosting, domain & upkeep", "Handled"],
      ] as [string, string][],
    },
  },

  founders: {
    eyebrow: "Who we are",
    title: "Two disciples serving the local church.",
    cta: { label: "Learn more about us", href: "/about-us" },
    people: [
      {
        name: "Jason",
        role: "Design & Engineering",
        bio: "I came to saving faith in 2024, and it rewired how I think about my work. I design and build everything — and I'd rather spend that ability on God's Kingdom than on anything else.",
      },
      {
        name: "Arjun",
        role: "Marketing & Relationships",
        bio: "Campus minister on staff at our church. I watched what this did for our staff and our members — I'm the one who said: other churches need this.",
      },
    ],
  },

  cta: {
    title: "Let's see how we can build this for you.",
    sub: "Hop on a call, show us your site and your systems behind it, and we'll see how we can help. Let's build the Lord's Kingdom together!",
    primary: "Book a call to chat!",
    secondary: "see a live demo",
  },

  offer: {
    eyebrow: "so, here's the offer",
    title: "We'd love to do this for",
    sub: "Everything from the story above — designed and built for your church.",
    cta: "Let's chat!",
    ctaNote: "if any of this would serve your church",
    items: [
      {
        tag: "the front door",
        title: "A custom site",
        body: "Designed from scratch — fast, functional, and entirely yours.",
        link: { demo: "site", label: "browse the live site" },
      },
      {
        tag: "the toolkit",
        title: "A clean, custom CMS",
        body: "Your staff edit anything in seconds and spin up new pages in minutes.",
        link: { demo: "cms", label: "tour the CMS" },
      },
      {
        tag: "the bridge",
        title: "A ChMS integration",
        body: "Your system becomes the single source of truth — no double entry, ever.",
        link: null,
      },
      {
        tag: "the whole point",
        title: "Member login & next steps",
        body: "Your discipleship pathway, surfaced for every member who signs in.",
        link: { demo: "member", label: "demo the member login" },
      },
    ] as {
      tag: string;
      title: string;
      body: string;
      link: { demo: "site" | "cms" | "member"; label: string } | null;
    }[],
  },
};

export type ChapterData = (typeof V2.chapters)[number];
export type ReceiptData = typeof V2.receipts.site;
export type DemoLink = typeof V2.demos.site;
