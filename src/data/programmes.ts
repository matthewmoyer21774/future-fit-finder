export interface Programme {
  id: string;
  name: string;
  category: string;
  description: string;
  targetAudience: string;
  duration: string;
  url: string;
  keyTopics: string[];
}

// Placeholder data — replace with your actual JSON import
export const programmes: Programme[] = [
  {
    id: "1",
    name: "The Vlerick MBA",
    category: "MBA",
    description: "A transformative full-time MBA programme designed for ambitious professionals seeking to accelerate their career.",
    targetAudience: "Mid-career professionals with 3-10 years of experience",
    duration: "1 year full-time",
    url: "https://www.vlerick.com/en/programmes/mba",
    keyTopics: ["Leadership", "Strategy", "Innovation", "Entrepreneurship"],
  },
  {
    id: "2",
    name: "Executive MBA",
    category: "MBA",
    description: "A part-time MBA for senior leaders who want to sharpen their strategic thinking while continuing to work.",
    targetAudience: "Senior managers and executives with 8+ years of experience",
    duration: "2 years part-time",
    url: "https://www.vlerick.com/en/programmes/executive-mba",
    keyTopics: ["Strategic Leadership", "Digital Transformation", "Global Business"],
  },
  {
    id: "3",
    name: "Advanced Management Programme",
    category: "Executive Education",
    description: "For experienced leaders ready to take the next step in their executive career.",
    targetAudience: "C-suite executives and senior directors",
    duration: "6 months (modular)",
    url: "https://www.vlerick.com/en/programmes/executive-education",
    keyTopics: ["Corporate Strategy", "Board Governance", "Leadership"],
  },
  {
    id: "4",
    name: "Digital Marketing & AI",
    category: "Open Programmes",
    description: "Leverage AI and data analytics to transform your marketing strategy and customer engagement.",
    targetAudience: "Marketing managers and digital professionals",
    duration: "4 days",
    url: "https://www.vlerick.com/en/programmes/open-programmes",
    keyTopics: ["AI in Marketing", "Data Analytics", "Customer Journey", "Digital Strategy"],
  },
  {
    id: "5",
    name: "Finance for Non-Financial Managers",
    category: "Open Programmes",
    description: "Build financial acumen to make better business decisions and communicate effectively with finance teams.",
    targetAudience: "Non-finance managers and team leaders",
    duration: "3 days",
    url: "https://www.vlerick.com/en/programmes/open-programmes",
    keyTopics: ["Financial Statements", "Budgeting", "ROI Analysis", "Cost Management"],
  },
  {
    id: "6",
    name: "Leading High-Performance Teams",
    category: "Leadership",
    description: "Develop the skills to build, motivate, and sustain high-performing teams in complex environments.",
    targetAudience: "Team leaders and middle managers",
    duration: "3 days",
    url: "https://www.vlerick.com/en/programmes/open-programmes",
    keyTopics: ["Team Dynamics", "Motivation", "Conflict Resolution", "Coaching"],
  },
  {
    id: "7",
    name: "Negotiation Skills Masterclass",
    category: "Open Programmes",
    description: "Master the art and science of negotiation for complex business deals and stakeholder management.",
    targetAudience: "Managers involved in negotiations and deal-making",
    duration: "2 days",
    url: "https://www.vlerick.com/en/programmes/open-programmes",
    keyTopics: ["Negotiation Strategy", "Influence", "Stakeholder Management"],
  },
  {
    id: "8",
    name: "Sustainability & Business Strategy",
    category: "Executive Education",
    description: "Integrate sustainability into core business strategy and create long-term value.",
    targetAudience: "Senior leaders and sustainability managers",
    duration: "5 days",
    url: "https://www.vlerick.com/en/programmes/executive-education",
    keyTopics: ["ESG", "Circular Economy", "Sustainable Innovation", "Reporting"],
  },
];

export const categories = [...new Set(programmes.map((p) => p.category))];
