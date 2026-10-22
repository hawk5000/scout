export type PublicDemoCategory =
  "Corporate" | "Project" | "Event" | "Competitor" | "Property";

export type PublicDemoFinding = {
  id: string;
  category: PublicDemoCategory;
  title: string;
  location: string;
  status: string;
  dateLabel: string;
  summary: string;
  relevance: string;
  unknowns: string[];
  source: { label: string; url: string; published: string };
  sentiment?: "Positive" | "Mixed" | "Neutral";
};

/** Reserved .example sources and plainly fictional records for the public demo only. */
export const publicDemoFindings: PublicDemoFinding[] = [
  {
    id: "sample-corporate-alder",
    category: "Corporate",
    title: "Alder Research Campus adds a training wing",
    location: "Alder District",
    status: "Announced",
    dateLabel: "Illustrative dates · Nov 9–Dec 18, 2026",
    summary:
      "A fictional campus announcement describes a six-week equipment installation and staff training period.",
    relevance:
      "Visiting trainers or installers could need weekday rooms. The source does not confirm travel or lodging.",
    unknowns: [
      "Whether staff travel from outside the area",
      "Room count or hotel preference",
    ],
    source: {
      label: "Alder Research Campus · sample news",
      url: "https://alder-campus.example/news/training-wing",
      published: "Oct 16, 2026 (illustrative)",
    },
  },
  {
    id: "sample-project-northbank",
    category: "Project",
    title: "Northbank Bridge Renewal names Juniper Civil",
    location: "Northbank",
    status: "Awarded",
    dateLabel: "Illustrative dates · Oct 5, 2026–Apr 30, 2027",
    summary:
      "A fictional public works update names Juniper Civil as contractor for a bridge renewal project.",
    relevance:
      "A nonlocal crew could create extended-stay demand. Workforce origin and lodging plans are unknown.",
    unknowns: [
      "Crew origin and rotation",
      "Whether lodging is required",
      "Who selects accommodation",
    ],
    source: {
      label: "Northbank Public Works · sample notice",
      url: "https://northbank.example/projects/bridge-renewal",
      published: "Oct 14, 2026 (illustrative)",
    },
  },
  {
    id: "sample-event-harbor",
    category: "Event",
    title: "Harbor Youth Invitational returns in February",
    location: "Demo Harbor",
    status: "Confirmed",
    dateLabel: "Illustrative dates · Feb 12–14, 2027",
    summary:
      "A fictional organizer lists a three-day youth tournament at Harbor Courts.",
    relevance:
      "Traveling teams and families may stay overnight. Participation from outside Demo Harbor is not confirmed.",
    unknowns: [
      "Visiting team count",
      "Attendance",
      "Existing hotel agreements",
    ],
    source: {
      label: "Harbor Courts · sample event calendar",
      url: "https://harbor-courts.example/events/invitational",
      published: "Oct 12, 2026 (illustrative)",
    },
  },
  {
    id: "sample-competitor-harbor-ridge",
    category: "Competitor",
    title: "Harbor Ridge Hotel announces a new meeting suite",
    location: "Demo Harbor · 2.4 miles away",
    status: "Noteworthy change",
    dateLabel: "Illustrative date · Oct 18, 2026",
    summary:
      "A fictional competitor announcement describes a renovated meeting suite and flexible room layouts.",
    relevance:
      "This may strengthen a nearby alternative for small meetings. Rates, capacity and actual demand are not known.",
    unknowns: [
      "Room capacity and opening date",
      "Pricing",
      "Whether the change affects local bookings",
    ],
    source: {
      label: "Harbor Ridge Hotel · sample announcement",
      url: "https://harbor-ridge.example/news/meeting-suite",
      published: "Oct 18, 2026 (illustrative)",
    },
  },
  {
    id: "sample-property-mention",
    category: "Property",
    title: "A guest mentions Willow House Hotel’s welcoming team",
    location: "Willow House Hotel · Demo Harbor",
    status: "Public mention",
    dateLabel: "Illustrative date · Oct 17, 2026",
    summary:
      "A fictional public review praises a warm welcome and mentions a longer-than-expected check-in wait.",
    relevance:
      "One mixed comment can help the team notice a service detail. It is not enough to establish a wider trend.",
    unknowns: [
      "Whether the experience is recurring",
      "Context around the arrival time",
      "No trend inferred from one mention",
    ],
    sentiment: "Mixed",
    source: {
      label: "Demo Harbor Guestbook · sample review",
      url: "https://guestbook.example/reviews/willow-house/184",
      published: "Oct 17, 2026 (illustrative)",
    },
  },
];

export const publicDemoCategories: PublicDemoCategory[] = [
  "Corporate",
  "Project",
  "Event",
  "Competitor",
  "Property",
];

export const publicDemoBriefing = {
  title: "A sample week around Willow House Hotel",
  asOf: "Illustrative sample · not current research",
  introduction:
    "A compact view of possible local demand and one nearby competitive change. Every record and source below is invented for this demonstration.",
  sections: [
    {
      heading: "Potential weekday crew stays",
      findingIds: ["sample-corporate-alder", "sample-project-northbank"],
      implication:
        "If the installation team or contractor brings in nonlocal staff, weekday or extended stays may be relevant. A hotel sales contact could first confirm crew origin and timing.",
      unknowns:
        "Travel, headcount, lodging arrangements and booking decision-maker are unconfirmed.",
    },
    {
      heading: "A three-day event to keep in view",
      findingIds: ["sample-event-harbor"],
      implication:
        "The tournament could bring visiting families and teams. Confirm travel participation before estimating any room opportunity.",
      unknowns:
        "No attendance, visiting-team count or hotel block is provided.",
    },
    {
      heading: "A competitor is improving meeting space",
      findingIds: ["sample-competitor-harbor-ridge"],
      implication:
        "The announcement suggests a stronger local option for small meetings. Compare your own meeting offer before deciding whether action is needed.",
      unknowns: "Capacity, price, opening date and market impact are unknown.",
    },
    {
      heading: "One mixed guest mention",
      findingIds: ["sample-property-mention"],
      implication:
        "The review pairs positive staff feedback with a check-in wait. It may be useful context for the team, without treating one comment as a trend.",
      unknowns: "Frequency and operational context are not established.",
    },
  ],
};

/** A readable text copy for the public, isolated demonstration. */
export function publicDemoBriefingText() {
  return [
    `${publicDemoBriefing.title} — Willow House Hotel`,
    `FICTIONAL SAMPLE · ${publicDemoBriefing.asOf}`,
    "Every hotel, event, mention and source below is invented; no live research was run.",
    ...publicDemoBriefing.sections.flatMap((section) => [
      "",
      section.heading,
      section.implication,
      `Still unknown: ${section.unknowns}`,
      "Evidence:",
      ...section.findingIds.flatMap((id) => {
        const finding = publicDemoFindings.find((item) => item.id === id);
        return finding
          ? [
              `${finding.title} — ${finding.source.label}`,
              `Published ${finding.source.published}; ${finding.source.url}`,
            ]
          : [];
      }),
    ]),
    "",
    "Illustrative content only. No current research, paid calls, schedules or notifications.",
  ].join("\n");
}

/** One row per source-linked finding so a briefing CSV stays auditable. */
export function publicDemoBriefingCsv() {
  const header = [
    "Fictional sample",
    "Hotel",
    "Location",
    "Briefing",
    "Section",
    "Finding",
    "Source",
    "Source URL",
    "Published",
    "Lodging implication",
    "Unknowns",
  ];
  const cell = (value: string) => {
    const safe = /^[\s]*[=+@\-]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = publicDemoBriefing.sections.flatMap((section) =>
    section.findingIds.flatMap((id) => {
      const finding = publicDemoFindings.find((item) => item.id === id);
      return finding
        ? [
            [
              "SYNTHETIC — NOT LIVE RESEARCH",
              "Willow House Hotel",
              "Demo Harbor, Washington",
              publicDemoBriefing.title,
              section.heading,
              finding.title,
              finding.source.label,
              finding.source.url,
              finding.source.published,
              section.implication,
              section.unknowns,
            ],
          ]
        : [];
    }),
  );
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

export function publicDemoCsv(findings: PublicDemoFinding[]) {
  const header = [
    "Fictional sample",
    "Category",
    "Finding",
    "Location",
    "Date",
    "Lodging relevance",
    "Source",
    "Source URL",
    "Unknowns",
  ];
  const cell = (value: string) => {
    const safe = /^[\s]*[=+@\-]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [
    header,
    ...findings.map((f) => [
      "SYNTHETIC — NOT LIVE RESEARCH",
      f.category,
      f.title,
      f.location,
      f.dateLabel,
      f.relevance,
      f.source.label,
      f.source.url,
      f.unknowns.join("; "),
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
}
