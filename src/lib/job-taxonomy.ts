import type { RankedJob } from "@/types";

export type RoleProfile = {
  title: string;
  category: string;
  aliases: string[];
  skills: string[];
};

const MAX_RESULT_SKILLS = 16;
const COMMON_SKILL_STOPWORDS = new Set([
  "and",
  "with",
  "for",
  "the",
  "team",
  "role",
  "work",
  "jobs",
  "job",
  "remote",
  "full-time",
  "full time",
  "part-time",
  "part time",
  "experience",
  "senior",
  "junior",
  "manager",
  "specialist",
  "associate",
  "lead",
  "not listed"
]);

export const ROLE_PROFILES: RoleProfile[] = [
  {
    title: "Staff Nurse",
    category: "Healthcare",
    aliases: ["nurse", "registered nurse", "rn", "clinical nurse", "nursing officer", "ward nurse"],
    skills: ["Patient care", "Clinical support", "Medication administration", "Electronic medical records", "Ward coordination"]
  },
  {
    title: "Physician",
    category: "Healthcare",
    aliases: ["doctor", "medical officer", "general practitioner", "consultant"],
    skills: ["Patient assessment", "Diagnosis", "Treatment planning", "Clinical documentation", "Care coordination"]
  },
  {
    title: "Pharmacist",
    category: "Healthcare",
    aliases: ["clinical pharmacist", "retail pharmacist", "pharmacy officer"],
    skills: ["Prescription review", "Medication counseling", "Pharmacy operations", "Inventory control", "Patient safety"]
  },
  {
    title: "Sales Executive",
    category: "Sales",
    aliases: ["sales", "sales officer", "business development", "account executive", "sales representative"],
    skills: ["Lead generation", "Client relationship management", "Negotiation", "Pipeline management", "Sales reporting"]
  },
  {
    title: "Account Manager",
    category: "Sales",
    aliases: ["key account manager", "customer success manager", "client partner"],
    skills: ["Account growth", "Stakeholder management", "Renewals", "Presentation skills", "CRM tools"]
  },
  {
    title: "Customer Support Specialist",
    category: "Support",
    aliases: ["customer service", "support agent", "customer care", "helpdesk specialist"],
    skills: ["Customer communication", "Ticketing systems", "Problem solving", "Email support", "CRM tools"]
  },
  {
    title: "Administrative Assistant",
    category: "Operations",
    aliases: ["admin assistant", "office assistant", "administration officer", "secretary"],
    skills: ["Calendar management", "Document preparation", "Office coordination", "Email communication", "Record keeping"]
  },
  {
    title: "Project Manager",
    category: "Operations",
    aliases: ["program manager", "delivery manager", "project coordinator", "implementation manager"],
    skills: ["Project planning", "Stakeholder management", "Timeline tracking", "Risk management", "Agile delivery"]
  },
  {
    title: "Operations Manager",
    category: "Operations",
    aliases: ["operations lead", "operations coordinator", "service manager"],
    skills: ["Process improvement", "Team leadership", "KPI tracking", "Workflow design", "Cross-functional coordination"]
  },
  {
    title: "HR Officer",
    category: "People",
    aliases: ["human resources", "recruiter", "talent acquisition", "people operations"],
    skills: ["Recruitment", "Interview coordination", "Employee relations", "HR administration", "Payroll support"]
  },
  {
    title: "Accountant",
    category: "Finance",
    aliases: ["accounts officer", "finance executive", "bookkeeper", "finance analyst"],
    skills: ["Bookkeeping", "Financial reporting", "Accounts payable", "Accounts receivable", "Excel"]
  },
  {
    title: "Financial Analyst",
    category: "Finance",
    aliases: ["finance analyst", "investment analyst", "fp&a analyst"],
    skills: ["Financial modeling", "Forecasting", "Reporting", "Excel", "Variance analysis"]
  },
  {
    title: "Frontend Engineer",
    category: "Technology",
    aliases: ["frontend developer", "react developer", "ui engineer", "web developer"],
    skills: ["React", "TypeScript", "JavaScript", "HTML", "CSS"]
  },
  {
    title: "Backend Engineer",
    category: "Technology",
    aliases: ["backend developer", "api engineer", "server-side developer", "software engineer"],
    skills: ["Node.js", "APIs", "SQL", "System design", "Cloud services"]
  },
  {
    title: "Full Stack Engineer",
    category: "Technology",
    aliases: ["full stack developer", "fullstack developer", "software developer"],
    skills: ["React", "Node.js", "APIs", "SQL", "TypeScript"]
  },
  {
    title: "DevOps Engineer",
    category: "Technology",
    aliases: ["site reliability engineer", "cloud engineer", "platform engineer"],
    skills: ["AWS", "CI/CD", "Docker", "Kubernetes", "Infrastructure as code"]
  },
  {
    title: "Data Analyst",
    category: "Data",
    aliases: ["business analyst", "reporting analyst", "analytics specialist"],
    skills: ["SQL", "Excel", "Dashboarding", "Data visualization", "Reporting"]
  },
  {
    title: "Data Scientist",
    category: "Data",
    aliases: ["machine learning engineer", "ml engineer", "analytics scientist"],
    skills: ["Python", "Machine learning", "SQL", "Statistics", "Model evaluation"]
  },
  {
    title: "Graphic Designer",
    category: "Creative",
    aliases: ["designer", "visual designer", "brand designer", "creative designer"],
    skills: ["Adobe Photoshop", "Adobe Illustrator", "Branding", "Social media creatives", "Typography"]
  },
  {
    title: "Product Designer",
    category: "Design",
    aliases: ["ux designer", "ui ux designer", "ui designer", "ux researcher"],
    skills: ["Figma", "Design systems", "User research", "Wireframing", "Prototyping"]
  },
  {
    title: "Marketing Executive",
    category: "Marketing",
    aliases: ["digital marketer", "marketing specialist", "growth marketer", "marketing coordinator"],
    skills: ["Campaign management", "Content marketing", "Social media", "SEO", "Email marketing"]
  },
  {
    title: "SEO Specialist",
    category: "Marketing",
    aliases: ["seo executive", "search marketer", "organic growth specialist"],
    skills: ["SEO", "Keyword research", "Technical SEO", "Content optimization", "Analytics"]
  },
  {
    title: "Content Writer",
    category: "Marketing",
    aliases: ["copywriter", "content specialist", "editor"],
    skills: ["Copywriting", "Content strategy", "SEO writing", "Editing", "Research"]
  },
  {
    title: "Teacher",
    category: "Education",
    aliases: ["instructor", "lecturer", "school teacher", "subject teacher"],
    skills: ["Lesson planning", "Classroom management", "Student assessment", "Curriculum delivery", "Communication"]
  },
  {
    title: "Academic Researcher",
    category: "Education",
    aliases: ["research assistant", "research associate", "lecturer"],
    skills: ["Research methods", "Academic writing", "Data analysis", "Literature review", "Presentation"]
  },
  {
    title: "Chef",
    category: "Hospitality",
    aliases: ["cook", "line cook", "head chef", "kitchen chef"],
    skills: ["Food preparation", "Kitchen operations", "Menu planning", "Food safety", "Inventory control"]
  },
  {
    title: "Hotel Receptionist",
    category: "Hospitality",
    aliases: ["front desk agent", "guest services", "front office executive"],
    skills: ["Guest communication", "Reservations", "Front desk operations", "POS systems", "Problem resolution"]
  },
  {
    title: "Civil Engineer",
    category: "Engineering",
    aliases: ["site engineer", "structural engineer", "construction engineer"],
    skills: ["AutoCAD", "Site supervision", "Project estimation", "Construction planning", "Quality control"]
  },
  {
    title: "Mechanical Engineer",
    category: "Engineering",
    aliases: ["maintenance engineer", "production engineer", "plant engineer"],
    skills: ["Preventive maintenance", "CAD", "Troubleshooting", "Equipment planning", "Quality assurance"]
  },
  {
    title: "Electrical Engineer",
    category: "Engineering",
    aliases: ["power engineer", "electronics engineer", "instrumentation engineer"],
    skills: ["Electrical systems", "Troubleshooting", "PLC", "AutoCAD", "Preventive maintenance"]
  }
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export const ROLE_OPTIONS = ROLE_PROFILES.map((profile) => profile.title);

export const SKILL_OPTIONS = Array.from(
  new Set(
    ROLE_PROFILES.flatMap((profile) => profile.skills).sort((left, right) => left.localeCompare(right))
  )
);

export function getRoleProfile(query?: string) {
  const needle = normalize(query ?? "");

  if (!needle) {
    return null;
  }

  return (
    ROLE_PROFILES.find((profile) => {
      const values = [profile.title, ...profile.aliases].map(normalize);
      return values.some((value) => value.includes(needle) || needle.includes(value));
    }) ?? null
  );
}

export function getSuggestedSkillsForRole(query?: string) {
  return getRoleProfile(query)?.skills ?? [];
}

export function getRoleSuggestions(query?: string, limit = 8) {
  const needle = normalize(query ?? "");

  if (!needle) {
    return ROLE_OPTIONS.slice(0, limit);
  }

  return ROLE_PROFILES.filter((profile) =>
    [profile.title, ...profile.aliases].some((value) => normalize(value).includes(needle) || needle.includes(normalize(value)))
  )
    .map((profile) => profile.title)
    .slice(0, limit);
}

export function collectAdvertisedSkills(jobs: RankedJob[], limit = MAX_RESULT_SKILLS) {
  const counts = new Map<string, number>();

  for (const job of jobs) {
    for (const keyword of job.keywords) {
      const cleaned = keyword.trim();
      const normalized = normalize(cleaned);

      if (!cleaned || cleaned.length < 3 || COMMON_SKILL_STOPWORDS.has(normalized)) {
        continue;
      }

      counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([skill]) => skill);
}

export function getSuggestedSkillOptions(desiredTitle: string, jobs: RankedJob[]) {
  const combined = [...getSuggestedSkillsForRole(desiredTitle), ...collectAdvertisedSkills(jobs), ...SKILL_OPTIONS];
  return Array.from(new Set(combined)).slice(0, 24);
}
