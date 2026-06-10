export const DATA = {
  brand: "Disciple Studio",
  tagline: "Modern, fast, custom websites for churches.",

  nav: [
    { label: "The Problem", href: "/#why" },
    { label: "Our Solution", href: "/#features" },
    { label: "Work", href: "/#showcase" },
    { label: "Who We Are", href: "/#founders" },
  ],

  hero: {
    kicker: "A studio for the local church",
    headline: ["Custom church websites built by disciples, to disciple."],
    sub: "We build modern and fast websites that welcome new people in and help the people already there grow as disciples \u2014 all while practically running itself.",
    primary: "Book A Call",
    secondary: "See Our Latest Work",
  },

  twoJobs: {
    eyebrow: "What a church website is really for",
    title: "Two jobs. One website.",
    intro:
      "A church website has two jobs. Most do half of one \u2014 we build for both.",
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
    eyebrow: "The problem",
    title: "Most churches are renting a website they\u2019ve outgrown.",
    pain: [
      {
        k: "The basic template",
        tag: "Same as everyone",
        v: "Templates look bland and don't function well. You\u2019re boxed into what the template allows \u2014 and you hit that ceiling fast.",
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
      {
        k: "The monthly bill",
        tag: "$100\u2013400 / mo",
        v: "$100\u2013$400 every month to platforms like Squarespace, Ekklesia 360, or Subsplash \u2014 forever, just to keep the lights on.",
      },
    ],
    beliefLabel: "And most importantly...",
    beliefHighlight: "The lack of deeper, personalized discipleship.",
  },

  features: [
    {
      id: "modern" as const,
      n: "01",
      tag: "The front door",
      title: "A custom, beautiful site that nails your branding",
      body: "Built on the same technology behind some of the fastest sites on the web. It loads instantly, looks right on every device, and has room to grow with your church for years \u2014 not a template you\u2019ll outgrow in two.",
      points: ["Custom Online Sermon Experience", "Custom Groups Finder"],
    },
    {
      id: "cms" as const,
      n: "02",
      tag: "Streamlined CMS",
      title:
        "A streamlined CMS your staff can easily use \u2014 and expand on their own.",
      body: "We build your CMS from scrath tailored to you. Exactly what you need, nothing you don't. Need a new sermon series page or a Christmas landing page? Build it with the blocks we set up. No bloated builder, no code.",
      points: ["Multi-campus support", "Designed for your needs"],
    },
    {
      id: "sync" as const,
      n: "03",
      tag: "Integration",
      title: "Your content stays in sync, automatically.",
      body: "We build a custom connection to Planning Center, Breeze, CCB, or whatever you run. Add a group or event there once and it shows up on the website. No double entry, no data falling out of sync. A standing gift of time back to your admin team.",
      points: [],
    },
    {
      id: "login" as const,
      n: "",
      tag: "The whole point",
      title: "Built-in member login with personalized next steps.",
      body: "You track discipleship data \u2014 we surface it. Members sign in and see their groups, their classes, and their next step. The website becomes a personalized hub that streamlines discipleship and moves people through the path you\u2019ve already built.",
      points: ["Secure member login", "Personalized next steps"],
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
    church: "Aletheia Church",
    location: "Built ground-up \u00B7 2025",
    url: "https://aletheia-website-seven.vercel.app/",
    urlLabel: "aletheia.org",
    stats: [] as { k: string; v: string }[],
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
    sub: "One project fee to design and build. After that, the site is yours \u2014 built on modern tooling with generous free tiers, so there\u2019s no subscription, no hosting bill, no lock-in.",
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

  aboutUs: {
    story: {
      eyebrow: "Our story",
      title: "It started with a conversation at church.",
      paragraphs: [
        "We met at Aletheia Church in the fall of 2024. Jason had just come to saving faith earlier that year, and Arjun had been serving in ministry operations for a while. A casual conversation after service turned into an hours-long talk about something we both noticed: the tools churches use online are not serving them well.",
        "Most church websites we looked at were template-based, disconnected from the software the church actually runs on, and built in a way that made staff afraid to touch them. But the deeper issue was this \u2014 none of them were designed to help someone grow as a disciple. They were digital brochures, not discipleship tools.",
        "So we started building. Jason brought the design and engineering background, Arjun brought the relational and operational side, and together we set out to build church websites that actually serve the mission of the church \u2014 to make disciples.",
      ],
    },

    mission: {
      eyebrow: "What drives us",
      title: "We believe the local church deserves better.",
      intro:
        "Every decision we make filters through one question: does this help a church welcome new people in and grow the people already there? If the answer is no, we don\u2019t build it.",
      values: [
        {
          label: "Discipleship first",
          body: "A website should do more than inform \u2014 it should help people take their next step of faith. That\u2019s why every site we build includes a personalized member experience that surfaces where someone is on their journey and what comes next.",
        },
        {
          label: "Built to last",
          body: "We don\u2019t rent you a platform that disappears when you stop paying. We build you a website on modern, open technology that you own outright. No monthly fees, no lock-in, no expiration date.",
        },
        {
          label: "Serve, not sell",
          body: "We\u2019re not a SaaS company looking for recurring revenue. We\u2019re two guys who love the local church and want to serve it well. That shapes everything \u2014 how we price, how we communicate, and how we build.",
        },
        {
          label: "Craft over speed",
          body: "We take on a handful of churches at a time so we can give each one the attention it deserves. Every site is designed from scratch for your church, your brand, and your congregation.",
        },
      ],
    },

    bios: {
      eyebrow: "The team",
      title: "Two people. One mission.",
      people: [
        {
          name: "Jason",
          role: "Design & Engineering",
          paragraphs: [
            "I came to saving faith in 2024, and it rewired how I think about my work. Before that, I had been designing and building software for years \u2014 but it was always for the next startup, the next product, the next thing. When God saved me, I started asking a different question: what if I used these skills for something that actually matters forever?",
            "I lead the design and engineering side of Disciple Studio. That means I\u2019m the one in Figma at midnight getting the spacing right, and the one writing the code that makes it all come alive. I care deeply about craft \u2014 every animation, every layout, every interaction should feel intentional and warm, the way a good church lobby does.",
            "My hope for Disciple Studio is simple: that the websites we build help someone who has never walked into a church feel welcome enough to show up, and help someone who is already there take their next step toward Jesus.",
          ],
          verse: {
            text: "Whatever you do, work heartily, as for the Lord and not for men.",
            ref: "Colossians 3:23",
          },
        },
        {
          name: "Arjun",
          role: "Marketing & Relationships",
          paragraphs: [
            "I\u2019ve spent years working at the intersection of marketing, operations, and ministry \u2014 and the pattern I kept seeing was this: churches had great vision but clunky tools. Staff were spending hours on manual data entry, fighting with website builders, and duct-taping together systems that were never designed to talk to each other.",
            "At Disciple Studio, I handle the relationships and the integrations. I\u2019m the one on the call with your team learning how you run things, what tools you use, and where the friction is. Then I work with Jason to make sure the website connects to all of it \u2014 Planning Center, Breeze, your giving platform, whatever you have \u2014 so that your team gets time back.",
            "What motivates me is watching the technology disappear. When a church admin tells me they don\u2019t even think about the website anymore because it just works, that\u2019s the win. The ministry comes forward, the tech fades into the background.",
          ],
          verse: {
            text: "And let us consider how to stir up one another to love and good works.",
            ref: "Hebrews 10:24",
          },
        },
      ],
    },

    cta: {
      title: ["We\u2019d love to hear", "your church\u2019s story."],
      sub: "Book a short call and tell us about your church \u2014 what\u2019s working, what\u2019s not, and what you dream it could be. Let's see how we might be able to further God's kingdom together!",
      primary: "Book a 20-min call",
      secondary: "Back to homepage",
    },
  },
};
