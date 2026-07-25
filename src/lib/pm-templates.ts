export type PMTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  estimated_hours: number;
  milestones: { title: string; offset_days: number; progress?: number }[];
  tasks: { title: string; status?: string; priority?: string; offset_days: number }[];
};

export const PM_TEMPLATES: PMTemplate[] = [
  {
    id: "software",
    name: "Software Development",
    description: "Standard agile software delivery with discovery → launch phases.",
    category: "Software",
    estimated_hours: 400,
    milestones: [
      { title: "Discovery & Requirements", offset_days: 14 },
      { title: "Design & Architecture", offset_days: 30 },
      { title: "MVP Development", offset_days: 60 },
      { title: "QA & UAT", offset_days: 80 },
      { title: "Launch", offset_days: 90 },
    ],
    tasks: [
      { title: "Kickoff meeting", priority: "high", offset_days: 1 },
      { title: "Gather requirements", priority: "high", offset_days: 7 },
      { title: "System design document", priority: "medium", offset_days: 20 },
      { title: "Setup dev environment", priority: "medium", offset_days: 15 },
      { title: "Build core modules", priority: "high", offset_days: 45 },
      { title: "Integration testing", priority: "medium", offset_days: 70 },
      { title: "UAT with client", priority: "high", offset_days: 80 },
      { title: "Deployment & handover", priority: "high", offset_days: 90 },
    ],
  },
  {
    id: "marketing",
    name: "Marketing Campaign",
    description: "Multi-channel marketing campaign from brief to reporting.",
    category: "Marketing",
    estimated_hours: 120,
    milestones: [
      { title: "Brief & Strategy Approved", offset_days: 7 },
      { title: "Creative Ready", offset_days: 21 },
      { title: "Campaign Live", offset_days: 30 },
      { title: "Post-campaign Report", offset_days: 60 },
    ],
    tasks: [
      { title: "Kickoff & brief signoff", priority: "high", offset_days: 2 },
      { title: "Audience research", priority: "medium", offset_days: 7 },
      { title: "Creative concepts", priority: "high", offset_days: 14 },
      { title: "Copy & assets production", priority: "medium", offset_days: 20 },
      { title: "Ad account setup", priority: "medium", offset_days: 25 },
      { title: "Launch campaign", priority: "high", offset_days: 30 },
      { title: "Weekly optimization", priority: "medium", offset_days: 45 },
      { title: "Final report", priority: "high", offset_days: 60 },
    ],
  },
  {
    id: "consulting",
    name: "Consulting Engagement",
    description: "Advisory engagement from discovery to recommendations.",
    category: "Consulting",
    estimated_hours: 200,
    milestones: [
      { title: "Discovery Complete", offset_days: 14 },
      { title: "Analysis Complete", offset_days: 35 },
      { title: "Final Recommendations", offset_days: 60 },
    ],
    tasks: [
      { title: "Stakeholder interviews", priority: "high", offset_days: 7 },
      { title: "Data collection", priority: "medium", offset_days: 14 },
      { title: "Current state analysis", priority: "high", offset_days: 25 },
      { title: "Benchmarking", priority: "medium", offset_days: 30 },
      { title: "Draft recommendations", priority: "high", offset_days: 45 },
      { title: "Client workshop", priority: "high", offset_days: 55 },
      { title: "Final report & presentation", priority: "high", offset_days: 60 },
    ],
  },
  {
    id: "event",
    name: "Event Management",
    description: "End-to-end planning and delivery of a corporate event.",
    category: "Events",
    estimated_hours: 160,
    milestones: [
      { title: "Venue & Vendors Booked", offset_days: 20 },
      { title: "Invitations Sent", offset_days: 35 },
      { title: "Event Day", offset_days: 60 },
      { title: "Post-Event Wrap-up", offset_days: 65 },
    ],
    tasks: [
      { title: "Define event objectives", priority: "high", offset_days: 3 },
      { title: "Budget approval", priority: "high", offset_days: 7 },
      { title: "Venue shortlist", priority: "medium", offset_days: 14 },
      { title: "Vendor contracts", priority: "medium", offset_days: 20 },
      { title: "Invitations & RSVPs", priority: "medium", offset_days: 35 },
      { title: "Run-of-show", priority: "high", offset_days: 50 },
      { title: "Event day execution", priority: "high", offset_days: 60 },
      { title: "Thank-you notes & report", priority: "medium", offset_days: 65 },
    ],
  },
];
