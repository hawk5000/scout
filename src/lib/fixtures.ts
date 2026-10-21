import type {
  Assessment,
  Category,
  Finding,
  Profile,
  ResearchRun,
  Workspace,
} from "./contracts";

export const demoProfile: Profile = {
  name: "Willow House Hotel",
  website: "https://willow-house.example",
  address: "100 Willow Lane, Demo Harbor, WA (fictional)",
  timezone: "America/Los_Angeles",
  confirmed: true,
  marketCenter: "Demo Harbor town center (fictional)",
  radiusMiles: 15,
  includedPlaces: ["Demo Harbor", "Northbank", "Alder District"],
  excludedPlaces: ["Outer islands"],
  categories: ["corporate", "project", "event"],
  priorities: ["Weekday business travel", "Multi-day events", "Extended stays"],
  exclusions: ["Day-only local gatherings"],
  recipients: [],
  scheduleDays: ["Tuesday", "Friday"],
  scheduleTime: "08:00",
};
const rows: {
  id: string;
  category: Category;
  title: string;
  summary: string;
  location: string;
  status: Finding["status"];
  start: string | null;
  end: string | null;
  inference: string;
  unknowns: string[];
  quality?: Finding["quality"];
  change?: string;
}[] = [
  {
    id: "corporate-alder",
    category: "corporate",
    title: "Alder Research Campus",
    summary:
      "The fictional campus announced a new training wing and a six-week equipment installation phase.",
    location: "Alder District",
    status: "Announced",
    start: "2026-11-09",
    end: "2026-12-18",
    inference:
      "A multi-week installation could involve visiting specialists. Their origin and accommodation plans are not established.",
    unknowns: [
      "Whether specialists travel from outside the area",
      "Lodging purchaser and room requirements",
    ],
    change: "Installation window added to the sample announcement.",
  },
  {
    id: "project-northbank",
    category: "project",
    title: "Northbank Bridge Renewal",
    summary:
      "The fictional public works update names Juniper Civil as the contractor for bridge renewal.",
    location: "Northbank",
    status: "Active",
    start: "2026-10-05",
    end: "2027-04-30",
    inference:
      "The project may create temporary accommodation needs if the contractor mobilizes nonlocal staff.",
    unknowns: ["Workforce origin", "Crew rotation and overnight needs"],
    change: "Juniper Civil identified as the awarded contractor.",
  },
  {
    id: "event-harbor",
    category: "event",
    title: "Harbor Youth Invitational · 2027",
    summary:
      "The fictional organizer lists a three-day youth tournament at Harbor Courts.",
    location: "Demo Harbor",
    status: "Confirmed",
    start: "2027-02-12",
    end: "2027-02-14",
    inference:
      "A multi-day competition may bring visiting teams and families. Overnight participation is unconfirmed.",
    unknowns: [
      "Confirmed visiting teams",
      "Existing hotel agreements",
      "Attendance",
    ],
    change: "Event dates changed from February 5–7 to February 12–14.",
  },
  {
    id: "corporate-moss",
    category: "corporate",
    title: "Moss & Field Distribution",
    summary:
      "A fictional directory lists a local distribution facility; no travel activity is evidenced.",
    location: "Northbank",
    status: "Active",
    start: null,
    end: null,
    inference:
      "Local presence alone does not establish hotel demand. Travel relevance remains unknown.",
    unknowns: ["Any recurring visitor travel", "A verified public contact"],
    quality: "Needs verification",
  },
  {
    id: "project-water",
    category: "project",
    title: "East Reach Water Upgrade",
    summary:
      "A fictional planning notice describes a proposed treatment-system upgrade awaiting award.",
    location: "East Reach",
    status: "Proposed",
    start: null,
    end: null,
    inference:
      "Specialist installation may be relevant if the project is awarded. No traveling workforce is established.",
    unknowns: ["Award date", "Contractor", "Work schedule"],
    quality: "Needs verification",
  },
  {
    id: "event-design",
    category: "event",
    title: "Coastal Design Assembly",
    summary:
      "The fictional organizer lists a two-day professional gathering at the Harbor Exchange.",
    location: "Demo Harbor",
    status: "Confirmed",
    start: "2026-12-03",
    end: "2026-12-04",
    inference:
      "A two-day program may encourage overnight stays for nonlocal attendees.",
    unknowns: ["Participant origins", "Attendance", "Room blocks"],
  },
  {
    id: "corporate-pine",
    category: "corporate",
    title: "Pineway Service Academy",
    summary:
      "An older fictional announcement describes a regional technician training location.",
    location: "Alder District",
    status: "Active",
    start: null,
    end: null,
    inference:
      "Regional training could support weekday travel, but the program needs fresh verification.",
    unknowns: ["Whether classes still operate", "Current training calendar"],
    quality: "Stale",
  },
  {
    id: "project-mill",
    category: "project",
    title: "Old Mill Refit",
    summary: "The fictional owner reports that the plant refit is complete.",
    location: "Northbank",
    status: "Completed",
    start: "2026-06-01",
    end: "2026-09-30",
    inference:
      "The completed phase should not be treated as current crew demand.",
    unknowns: ["Any separate follow-on phase"],
  },
  {
    id: "event-river",
    category: "event",
    title: "Riverlight Weekend",
    summary:
      "The fictional organizer has canceled this edition of the outdoor arts gathering.",
    location: "Demo Harbor",
    status: "Canceled",
    start: "2026-11-20",
    end: "2026-11-22",
    inference:
      "The canceled edition should not be used as a future lodging opportunity.",
    unknowns: ["Whether a later edition will be announced"],
  },
];
export const findings: Finding[] = rows.map((r, index) => ({
  id: r.id,
  entityId: `entity-${r.id}`,
  category: r.category,
  title: r.title,
  summary: r.summary,
  location: r.location,
  status: r.status,
  start: r.start,
  end: r.end,
  organizations: [
    r.id === "project-northbank"
      ? "Juniper Civil (fictional)"
      : `${r.title.split(" · ")[0]} (fictional)`,
  ],
  publicContact: null,
  firstSeenAt:
    r.quality === "Stale" ? "2026-08-04T15:00:00Z" : "2026-10-09T15:00:00Z",
  lastCheckedAt:
    r.quality === "Stale" ? "2026-08-04T15:00:00Z" : "2026-10-20T15:00:00Z",
  lastVerifiedAt: null,
  quality: r.quality ?? "Sample evidence",
  evidence: [
    {
      id: `source-${index}`,
      url: `https://sources.example/${r.id}`,
      publisher: "Fictional primary-source example",
      publishedAt: r.quality === "Stale" ? "2026-08-03" : "2026-10-08",
      retrievedAt:
        r.quality === "Stale" ? "2026-08-04T15:00:00Z" : "2026-10-20T15:00:00Z",
      lastVerifiedAt: null,
      claim: r.summary,
      verification:
        r.quality === "Needs verification" ? "unavailable" : "fictional",
    },
  ],
  versions: [
    {
      id: `${r.id}-v1`,
      at: "2026-10-09T15:00:00Z",
      summary: "Added to fictional baseline.",
      material: true,
      before: null,
      after: r.change ? "Initial sample details; update pending." : r.summary,
      evidenceIds: [`source-${index}`],
    },
    ...(r.change
      ? [
          {
            id: `${r.id}-v2`,
            at: "2026-10-16T15:00:00Z",
            summary: r.change,
            material: true,
            before: "Initial sample details; update pending.",
            after: r.summary,
            evidenceIds: [`source-${index}`],
          },
        ]
      : []),
  ],
}));
export const assessments: Assessment[] = rows.map((r) => ({
  findingId: r.id,
  inference: r.inference,
  rationale: r.summary,
  unknowns: r.unknowns,
  version: 1,
}));
export const runs: ResearchRun[] = [
  {
    id: "run-quiet",
    type: "update",
    cycleKey: "demo-2026-10-20",
    status: "Completed",
    at: "2026-10-20T15:00:00Z",
    newIds: [],
    changedIds: [],
    warnings: ["Fictional scenario; no sources were fetched."],
    categories: ["corporate", "project", "event"],
    summary: "No meaningful changes found.",
    checkpoint: "fixture-complete",
    simulated: true,
    actualCostUsd: null,
  },
  {
    id: "run-changes",
    type: "update",
    cycleKey: "demo-2026-10-16",
    status: "Completed",
    at: "2026-10-16T15:00:00Z",
    newIds: [],
    changedIds: rows.slice(0, 3).map((r) => r.id),
    warnings: ["Fictional scenario; no notifications were sent."],
    categories: ["corporate", "project", "event"],
    summary: "Three material changes to existing findings.",
    checkpoint: "fixture-complete",
    simulated: true,
    actualCostUsd: null,
  },
  {
    id: "run-partial",
    type: "update",
    cycleKey: "demo-2026-10-13",
    status: "Partial",
    at: "2026-10-13T15:00:00Z",
    newIds: [],
    changedIds: [],
    warnings: [
      "Sample source outage: project award records unavailable. Last successful records retained.",
    ],
    categories: ["corporate", "project", "event"],
    summary: "Coverage incomplete. Project award verification needs attention.",
    checkpoint: "fixture-source-unavailable",
    simulated: true,
    actualCostUsd: null,
  },
  {
    id: "run-baseline",
    type: "baseline",
    cycleKey: "demo-baseline-v1",
    status: "Completed",
    at: "2026-10-09T15:00:00Z",
    newIds: rows.map((r) => r.id),
    changedIds: [],
    warnings: ["All nine findings are invented examples."],
    categories: ["corporate", "project", "event"],
    summary: "Initial fictional market blueprint established.",
    checkpoint: "fixture-complete",
    simulated: true,
    actualCostUsd: null,
  },
];
export const defaultCoverage: Workspace["coverage"] = {
  corporate: {
    notes:
      "Local employers, facility expansions and training locations. Prioritize company announcements and economic-development sources.",
    paused: true,
  },
  project: {
    notes:
      "Infrastructure, construction and installations. Prioritize owner notices, award records and contractor announcements.",
    paused: true,
  },
  event: {
    notes:
      "Multi-day sports, conferences and professional gatherings. Prioritize organizer and venue calendars; keep event editions distinct.",
    paused: true,
  },
};
