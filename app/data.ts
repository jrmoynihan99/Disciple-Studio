export const DATA = {
  brand: "Disciple Studio",
  tagline: "Modern, fast, custom websites for churches.",

  nav: [
    { label: "Why", href: "#why" },
    { label: "What", href: "#what" },
    { label: "Who", href: "#founders" },
  ],

  hero: {
    kicker: "A studio for the local church",
    headline: ["Custom church websites,", "built by disciples."],
    sub: "We build modern and fast websites that welcome new people in and help the people already there grow as disciples. All while practically running itself.",
    primary: "Book A Call",
    secondary: "See Our Latest Work",
  },

  twoJobs: {
    eyebrow: "What a church website is really for",
    title: "Two jobs. One website.",
    intro: "A church website has two jobs. Most do half of one \u2014 we build for both.",
    jobs: [
      {
        n: "01",
        tag: "Reach",
        sub: "For the person who hasn\u2019t walked in yet.",
        body: "A warm, beautiful front door that helps a first-time guest feel like they belong, find a service time, and plan their visit \u2014 so they actually show up on Sunday.",
        points: [
          "Feel welcome before they arrive",
          "Plan a visit in two taps",
          "Show up \u2014 not just browse",
        ],
        outcome: "More first-time guests.",
      },
      {
        n: "02",
        tag: "Disciple",
        sub: "For the people already in the room.",
        body: "Members sign in and see information made for them, synced from your backend \u2014 their group, their giving, and the one next step on their journey of following Jesus. The site becomes your main tool for shepherding.",
        points: [
          "A personal next step for everyone",
          "Their group & discipleship in one place",
          "Synced with wherever you keep your member data",
        ],
        outcome: "Members who grow and stay.",
      },
    ],
    kicker:
      "The same website that brings someone in should help them follow. We build for both.",
  },

  problem: {
    eyebrow: "Why we started",
    title: "Most churches are renting a website they\u2019ve outgrown.",
    pain: [
      {
        k: "The monthly bill",
        tag: "$100\u2013400 / mo",
        v: "$100\u2013$400 every month to platforms like Squarespace, Ekklesia 360, or Subsplash \u2014 forever, just to keep the lights on.",
      },
      {
        k: "The clunky CMS",
        tag: "Hours lost",
        v: "Staff are scared to touch it. Editing a single event means wrestling a builder full of features you\u2019ll never use.",
      },
      {
        k: "The disconnected stack",
        tag: "Double entry",
        v: "Your website and your church software live in separate worlds, so someone re-types every event, group, and sermon by hand.",
      },
    ],
    beliefLabel: "But here\u2019s what we believe",
    belief:
      "We didn\u2019t start Disciple Studio to sell churches more software. We started it because we love the local church \u2014 and we believe the tools it runs on should serve it, not fight it. A website shouldn\u2019t be one more thing the staff dread. Built with care, it can do real ministry: welcoming the person who hasn\u2019t walked in yet, and walking with the people who already have.",
    beliefSign: "\u2014 Jason & Arjun, Co-Founders",
  },

  features: [
    {
      id: "login" as const,
      n: "01",
      tag: "Disciple",
      title: "Built in member login with personalized next steps.",
      body: "We build custom connections to your backend so members sign in and get a personal view \u2014 their groups, the next step on their discipleship path, and whatever else you track and want to surface. The website becomes your central tool for shepherding and moving members through your discipleship track.",
      points: ["Secure member login", "Personalized next steps", "Their groups & journey"],
    },
    {
      id: "modern" as const,
      n: "02",
      tag: "The front door",
      title: "A site that welcomes people in \u2014 and is built to last.",
      body: "Built on the same framework behind some of the fastest sites on the web, the site loads instantly, looks beautiful on every device, and has room to grow with your church for years \u2014 not a template you\u2019ll outgrow in two.",
      points: ["Multi-campus support", "Designed around your ministry", "Add pages & sections anytime"],
    },
    {
      id: "sync" as const,
      n: "03",
      tag: "Integration",
      title: "Your content stays in sync, automatically.",
      body: "We connect your site to Planning Center, Breeze, CCB, or whatever you run. Add an event, group, or other data there once and it appears on the website automatically. No double entry, no data mismatch. A standing gift of time back to your admin team.",
      points: ["Two-way sync with your tools", "Events, groups & sermons", "Update once, everywhere"],
    },
    {
      id: "cms" as const,
      n: "04",
      tag: "Easy to run",
      title: "An editor with exactly what you need \u2014 and nothing you don\u2019t.",
      body: "We tailor your editor to your church. The content you use, seamless to add and edit. No 200-setting builder, no fear of breaking the site. If a volunteer can fill out a form, they can update the website.",
      points: ["Only the content you want", "Plain-language labels", "Live preview"],
    },
    {
      id: "nocode" as const,
      n: "05",
      tag: "Ownership",
      title: "Expand and maintain it \u2014 no developer on call.",
      body: "Need a new sermon series page or a Christmas landing page? Build it from your studio with the blocks we set up. No code, no waiting. It\u2019s your site, fully in your hands.",
      points: ["Prebuilt content blocks", "No code, ever", "No retainer required"],
    },
    {
      id: "free" as const,
      n: "06",
      tag: "The cost",
      title: "$0 in monthly hosting or software fees.",
      body: "Built on modern tooling with generous free tiers, your site runs at no recurring cost. You pay us once to build it, and then it\u2019s yours to keep \u2014 no subscription quietly draining the budget every month.",
      points: ["No platform subscription", "No hosting bill", "You own everything"],
    },
  ],

  backendsLead: "We integrate with the tools you already use",
  backends: [
    "Planning Center",
    "Breeze",
    "Church Community Builder",
    "Rock RMS",
    "Tithe.ly",
    "Pushpay",
    "Subsplash",
    "Elvanto",
    "FellowshipOne",
    "ChurchTrac",
  ],

  showcase: {
    eyebrow: "The work",
    title: "Our first build is live.",
    sub: "A full ground-up website and content studio, connected to their church management system. Go see it for yourself.",
    church: "Grace Community Church",
    location: "Built ground-up \u00B7 2025",
    url: "#",
    urlLabel: "gracecommunity.example",
    stats: [
      { k: "0.4s", v: "Average load time" },
      { k: "$0", v: "Monthly fees" },
      { k: "1", v: "Place staff edit" },
    ],
  },

  testimonial: {
    quote:
      "We went from dreading our website to actually using it every week. Events just show up on their own now, and our staff can update anything without calling anyone. It finally feels like ours.",
    name: "Pastor [Name]",
    role: "Grace Community Church",
  },

  founders: {
    eyebrow: "Who we are",
    title: "Two disciples serving the local church.",
    body: "We\u2019re on a mission to further God\u2019s kingdom by helping churches better welcome and disciple the world.",
    people: [
      {
        name: "Jason",
        role: "Design & Engineering",
        bio: "Hey! I came to saving faith in 2024. I spearhead the design and building of the websites. I believe that software can be leveraged for the Glory of God and the furthering of his Kingdom!",
      },
      {
        name: "Arjun",
        role: "Marketing & Relationships",
        bio: "Connects the website to the tools churches already run, so the tech disappears and the ministry comes forward.",
      },
    ],
  },

  pricing: {
    eyebrow: "Simple by design",
    title: "Pay once. Own it forever.",
    sub: "One project fee to design and build. After that, the site is yours \u2014 no subscription, no hosting bill, no lock-in.",
    rows: [
      { k: "Custom design & build", v: "Included" },
      { k: "Tailored content studio (CMS)", v: "Included" },
      { k: "Church software integration", v: "Included" },
      { k: "Member login & discipleship steps", v: "Included" },
      { k: "Monthly platform fees", v: "$0" },
      { k: "Hosting", v: "$0" },
    ],
  },

  finalCta: {
    title: ["Let\u2019s build the website", "your church deserves."],
    sub: "Book a short call, or jump straight into a live demo. We\u2019d love to see how we can help further God\u2019s kingdom together!",
    primary: "Book a 20-min call",
    secondary: "See a live demo",
  },
};
