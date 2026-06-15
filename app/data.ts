const DEMO_URL =
  "https://aletheia-website-seven.vercel.app/demo?k=a557d77fe749fddba7b92e37";
const LIVE_URL = "https://aletheia-website-seven.vercel.app/";

export const DATA = {
  brand: "Disciple Studio",
  tagline: "Modern, fast, custom websites for churches.",
  demoUrl: DEMO_URL,

  nav: [
    { label: "The Problem", href: "/#why" },
    { label: "Our Solution", href: "/#features" },
    { label: "Work", href: "/#showcase" },
    { label: "Who We Are", href: "/about-us" },
  ],

  hero: {
    kicker: "A studio for the local church",
    headline: ["Custom church websites built by disciples, to disciple."],
    sub: "We build modern and fast websites that welcome new people in and help the people already there grow as disciples \u2014 all while practically running itself.",
    primary: "Let’s Chat",
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
    eyebrow: "What we noticed",
    title: "Every church website we visited informed.",
    titleEm: "Almost none discipled.",
    body: [
      "Most churches used an inflexible template that wasn't that great to use, and couldn't be meaningfully improved.",
      "When we talked to staff, we heard about the headache it was to manage and maintain the content on their site.",
      "And what we couldn\u2019t find was anything that helped streamline discipleship for it's members. To make their next step clear. The site never knew its people.",
    ],
    beliefLabel: "And we couldn\u2019t shake this",
    beliefLead:
      "It wasn\u2019t a lack of heart. The churches we love long to disciple \u2014",
    beliefHighlight: "their websites just weren\u2019t built for it.",
  },

  features: [
    {
      id: "modern" as const,
      n: "01",
      tag: "The front door",
      title: "A 100% custom site, built specifically for your church.",
      body: "Templates don't cut it. We work with you personally to build the site of your dreams. Built on the same technology behind the fastest sites on the web, it loads instantly, looks right on every device, and grows with your church for years. See below for a few of the custom features we've built:",
      cta: { label: "See a live demo", href: LIVE_URL },
      pages: [
        {
          title: "Interactive Discipleship Track",
          blurb:
            "We take your discipleship pathway and make it interactive. People click through each step or class, see what it is at a glance, and can jump into any one at any point.",
          href: `${LIVE_URL}next-steps`,
        },
        {
          title: "Custom Sermon Experience",
          blurb:
            "A focused, full-screen view for watching a sermon — the video, the slides, and a place to take notes, all on one page and nothing else.",
          href: `${LIVE_URL}watch/from-scarcity-to-surrender-cambridge`,
        },
        {
          title: "Custom Small Groups Finder",
          blurb:
            "Browse every group as a list or on a map. It filters down the moment someone searches or picks a filter — by day, location, life stage, or whatever you set up.",
          href: `${LIVE_URL}groups`,
        },
        {
          title: "Built In Custom Giving",
          blurb:
            "A giving page built into your site that links straight to your giving platform — with the fund and amount already filled in, so giving takes one tap.",
          href: `${LIVE_URL}give`,
        },
        {
          title: "Custom Class Pages",
          blurb:
            "A complete home for each class — videos, podcasts, and everything you teach in one place, with a direct link to sign up for the next session.",
          href: `${LIVE_URL}establishing-foundations`,
        },
        {
          title: "Whatever You Dream Of",
          blurb:
            "If your church needs a page or tool that doesn't exist yet, we build it. Make a list and bring it to our call!",
        },
      ] as { title: string; blurb: string; href?: string }[],
      points: [],
    },
    {
      id: "cms" as const,
      n: "02",
      tag: "Streamlined CMS",
      title:
        "A streamlined CMS your staff can easily use \u2014 and expand on their own.",
      body: "We build your CMS from scratch, tailored to you. Exactly what you need, nothing you don't. Need a new sermon series page or a Christmas landing page? Build it with the blocks we set up. No bloated builder, no code.",
      cta: null,
      pages: [] as { title: string; blurb: string; href?: string }[],
      points: [],
    },
    {
      id: "sync" as const,
      n: "03",
      tag: "Integration",
      title: "Your content stays in sync, automatically.",
      body: "We build a custom connection to Planning Center, Breeze, CCB, or whatever you run. Add a group or event there once and it shows up on the website. No double entry, no data falling out of sync — and your admin team gets those hours back.",
      cta: null,
      pages: [] as { title: string; blurb: string; href?: string }[],
      points: [],
    },
  ],

  discipleship: {
    eyebrow: "All to empower this",
    titleA: "Then a member signs in,",
    titleB: "and the website starts discipling.",
    sub: "The site reads the data from the church software you already run. The moment someone signs in, it knows them \u2014 their group, their giving, their place on the discipleship track you\u2019ve built \u2014 and shows them one clear next step toward following Jesus.",
    tabs: { before: "Any visitor", after: "Sarah, signed in" },
    beats: [
      {
        n: "01",
        k: "You define the pathway",
        v: "Baptism, community group, membership class, serving \u2014 whatever your church does to help people follow Jesus.",
      },
      {
        n: "02",
        k: "We connect your data",
        v: "Planning Center, Breeze, CCB \u2014 the site reads where each person actually is. No new system for your staff to manage.",
      },
      {
        n: "03",
        k: "Every member sees one next step",
        v: "Not a generic homepage. Their group, their progress, and the single next thing to do \u2014 every time they visit.",
      },
    ],
    cta: "See it in action",
    ctaNote: "Opens the live member experience on our latest build.",
    secondary: "Let’s Chat",
  },

  backendsLead: "We integrate with the tools you already use",
  backends: [
    "Planning Center",
    "Breeze",
    "Church Community Builder",
    "Rock RMS",
    "MinistryPlatform",
    "Tithely ChMS",
    "FellowshipOne",
    "Subsplash",
  ],

  showcase: {
    eyebrow: "The work",
    title: "Our latest build is live.",
    sub: "A full ground-up website and content studio, connected to their church management system. Go see it for yourself.",
    church: "Aletheia Church",
    location: "Built ground-up \u00B7 2025",
    url: DEMO_URL,
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
        photo: "/jason.jpg",
        bio: "Hey! I came to saving faith in 2024. I spearhead the design and engineering of the websites. I love leveraging software for the Glory of God and the furthering of his Kingdom!",
      },
      {
        name: "Arjun",
        role: "Relationships",
        photo: "/arjun.jpg",
        bio: "Software Engineer turned Day Trader and by grace now a campus minister in the Boston area. Passionate about Jesus and helping churches reach the lost and disciple others better.",
      },
    ],
  },

  pricing: {
    eyebrow: "How we work",
    title: "One build.\nOne partnership.",
    sub: "One project fee covers the design and build, and the site is yours. After launch, we stick around for when you need us. Direct access to the people who built your site, whenever you need us.",
    note: "We\u2019ll discuss pricing together on the call, based on your needs.",
    build: {
      label: "The build",
      note: "one project fee",
      rows: [
        { k: "Custom design & build", v: "Included" },
        { k: "Tailored content studio (CMS)", v: "Included" },
        { k: "Church software integration", v: "Included" },
        { k: "Member login & discipleship steps", v: "Included" },
      ],
    },
    partnership: {
      label: "The partnership",
      note: "monthly",
      rows: [
        { k: "Direct access to us \u2014 call, text, email", v: "Always" },
        { k: "Fixes, updates & new pages", v: "Covered" },
        { k: "Hosting, domain & upkeep", v: "Handled" },
      ],
    },
  },

  finalCta: {
    title: ["We\u2019d love to hear", "your church\u2019s story."],
    sub: "Every church runs differently, so every build starts with what yours actually needs.Hop on a 20-minute call and tell us about your church \u2014 what\u2019s working, what\u2019s not, and what you dream it could be. We\u2019d love to see how we can further God's Kingdom together!",
    primary: "Let’s Chat",
    secondary: "See a live demo",
  },

  aboutUs: {
    story: {
      eyebrow: "Our story",
      title: "It started with a build for our own church.",
      paragraphs: [
        "My pastor said he wanted a better website \u2014 something that looked better and worked better. I knew how to do that, so I dove in.",
        "I started where anyone would: the templates. The ones in our church software, the ones on every platform I could find. Some had modern design, but none had the functionality or flexibility I wanted for our church. So I built the site from scratch.",
        "Since I wasn\u2019t using a template anymore, I had to build a new CMS to power the site. The old one was bloated, confusing, and hard for staff to maintain \u2014 so I built them a clean, custom one. Exactly what they needed, nothing they didn\u2019t.",
        "Then I realized the church already kept everything \u2014 members, groups, events, registrations \u2014 in their church management software, Church Community Builder. Staff entered it all there, then typed it again into the website. So I built a custom integration: their backend became the single source of truth, and the website stayed in sync automatically.",
        "The last realization was the biggest. I could give members a login that surfaced everything the church already knew about their journey \u2014 their group, their classes, their next step. A personalized discipleship engine every member could use.",
        "That\u2019s when Arjun approached me and said we need to bring this to other churches. And here we are today!",
        "\u2014 Jason",
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
          body: "We don\u2019t rent you a platform that disappears when you stop paying. We build you a website on modern, open technology that you own outright. No platform rent, no lock-in, no expiration date.",
        },
        {
          label: "Serve, not sell",
          body: "We\u2019re not a platform collecting rent. When churches partner with us monthly, it\u2019s for people, not software \u2014 direct access to the two who built their site. We love the local church and want to serve it well, and that shapes how we price, how we communicate, and how we build.",
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
          photo: "/jason.jpg",
          paragraphs: [
            "I came to saving faith in 2024, and it rewired how I think about my work. Before that, I had been designing and building software for years \u2014 but I never really had a strong 'why'. After the Lord saved me, I began trying to find ways to use my skills and passion for his kingdom. ([see another passion project I built here](https://apps.apple.com/us/app/anchor-fight-lust-together/id6752869901)).",
            "I lead the design and engineering side of Disciple Studio. I come alongside your church as a partner, helping develop the perfect product for your church's needs. I love seeing a vision come to life.",
            "My hope for Disciple Studio is simple: that the websites we build help someone who has never walked into a church feel welcome enough to show up, and help someone who is already there take their next step toward Jesus.",
          ],
          verse: {
            text: "Whatever you do, work heartily, as for the Lord and not for men.",
            ref: "Colossians 3:23",
          },
        },
        {
          name: "Arjun",
          role: "Relationships",
          photo: "/arjun.jpg",
          paragraphs: [
            "I came to faith in 2024 (shortly after Jason) after trying my absolute hardest to find what was true and good. I spent my early twenties trying everything this world offered until one day, Jesus met me. After this moment, I made a career switch into ministry. Now I am a campus minister with ENC at MIT, Northeastern, and Boston University. Reaching the lost is a passion, and I believe in today\u2019s world the internet can truly be used for God\u2019s kingdom.",
            "I lead the Relationships side of Disciple Studio. I am your first point of contact. I love to problem-solve and deliver good and sound results with full honesty, as Jesus would. I look forward to serving your needs and making disciples!",
            "I know how important community is to the Christian life. I believe that with a good communication structure and personalized experiences for congregants, each person will feel like they are seen and will continue their walk with the Lord. This structure and solution is Disciple Studio. Look forward to speaking!",
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
      sub: "Every church runs differently, so every build starts with what yours actually needs. Hop on a 20-minute call and tell us about your church \u2014 what\u2019s working, what\u2019s not, and what you dream it could be. Let's see how we might be able to further God's kingdom together!",
      primary: "Let’s Chat",
      secondary: "Back to homepage",
    },
  },
};
