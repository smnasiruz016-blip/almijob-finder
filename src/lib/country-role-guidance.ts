import { getRoleProfile } from "@/lib/job-taxonomy";
import type { CountryRoleSuggestion } from "@/types";

const DEFAULT_ROLE_SUGGESTIONS: CountryRoleSuggestion[] = [
  { label: "Nurse", desiredTitle: "Staff Nurse", keyword: "Patient care" },
  { label: "Sales", desiredTitle: "Sales Executive", keyword: "Account growth" },
  { label: "Reception", desiredTitle: "Hotel Receptionist", keyword: "Front desk operations" },
  { label: "Data", desiredTitle: "Data Analyst", keyword: "SQL" }
];

const COUNTRY_ROLE_SUGGESTIONS: Record<string, CountryRoleSuggestion[]> = {
  Iceland: [
    { label: "Nurse", desiredTitle: "Staff Nurse", keyword: "Patient care" },
    { label: "Care", desiredTitle: "Administrative Assistant", keyword: "Care coordination" },
    { label: "Reception", desiredTitle: "Hotel Receptionist", keyword: "Guest communication" },
    { label: "Sales", desiredTitle: "Sales Executive", keyword: "Client relationship management" }
  ],
  Pakistan: [
    { label: "Nurse", desiredTitle: "Staff Nurse", keyword: "Clinical support" },
    { label: "Sales", desiredTitle: "Sales Executive", keyword: "Lead generation" },
    { label: "Teacher", desiredTitle: "Teacher", keyword: "Classroom management" },
    { label: "Accounts", desiredTitle: "Accountant", keyword: "Financial reporting" }
  ],
  Denmark: [
    { label: "Data", desiredTitle: "Data Analyst", keyword: "SQL" },
    { label: "Reception", desiredTitle: "Hotel Receptionist", keyword: "Guest services" },
    { label: "Sales", desiredTitle: "Account Manager", keyword: "Stakeholder management" },
    { label: "Chef", desiredTitle: "Chef", keyword: "Food safety" }
  ],
  Germany: [
    { label: "Engineering", desiredTitle: "Mechanical Engineer", keyword: "Troubleshooting" },
    { label: "Frontend", desiredTitle: "Frontend Engineer", keyword: "React" },
    { label: "Sales", desiredTitle: "Account Manager", keyword: "Renewals" },
    { label: "Operations", desiredTitle: "Project Manager", keyword: "Project planning" }
  ],
  India: [
    { label: "Support", desiredTitle: "Customer Support Specialist", keyword: "Ticketing systems" },
    { label: "Frontend", desiredTitle: "Frontend Engineer", keyword: "TypeScript" },
    { label: "Marketing", desiredTitle: "Marketing Executive", keyword: "Campaign management" },
    { label: "Accounts", desiredTitle: "Accountant", keyword: "Excel" }
  ],
  "United Kingdom": [
    { label: "Nurse", desiredTitle: "Staff Nurse", keyword: "Clinical documentation" },
    { label: "Product", desiredTitle: "Product Designer", keyword: "Design systems" },
    { label: "Reception", desiredTitle: "Hotel Receptionist", keyword: "Reservations" },
    { label: "Teacher", desiredTitle: "Teacher", keyword: "Lesson planning" }
  ],
  "United States": [
    { label: "Data", desiredTitle: "Data Analyst", keyword: "Dashboarding" },
    { label: "Frontend", desiredTitle: "Frontend Engineer", keyword: "React" },
    { label: "Sales", desiredTitle: "Account Manager", keyword: "Account growth" },
    { label: "Nurse", desiredTitle: "Staff Nurse", keyword: "Patient care" }
  ],
  "Saudi Arabia": [
    { label: "Nurse", desiredTitle: "Staff Nurse", keyword: "Medication administration" },
    { label: "Sales", desiredTitle: "Sales Executive", keyword: "Pipeline management" },
    { label: "Reception", desiredTitle: "Hotel Receptionist", keyword: "Front desk operations" },
    { label: "Admin", desiredTitle: "Administrative Assistant", keyword: "Office coordination" }
  ],
  "United Arab Emirates": [
    { label: "Sales", desiredTitle: "Sales Executive", keyword: "Client relationship management" },
    { label: "Reception", desiredTitle: "Hotel Receptionist", keyword: "Guest communication" },
    { label: "Marketing", desiredTitle: "Marketing Executive", keyword: "Social media" },
    { label: "Support", desiredTitle: "Customer Support Specialist", keyword: "Customer communication" }
  ]
};

function encodeSuggestionValue(value: string) {
  return encodeURIComponent(value);
}

export function getCountryRoleSuggestions(country: string) {
  return COUNTRY_ROLE_SUGGESTIONS[country] ?? DEFAULT_ROLE_SUGGESTIONS;
}

export function buildCountryRoleLinks(country: string, destinationPath: string) {
  return getCountryRoleSuggestions(country).map((suggestion) => {
    return {
      ...suggestion,
      href: `${destinationPath}?country=${encodeSuggestionValue(country)}&desiredTitle=${encodeSuggestionValue(
        suggestion.desiredTitle
      )}${suggestion.keyword ? `&keyword=${encodeSuggestionValue(suggestion.keyword)}` : ""}`
    };
  });
}

export function normalizeCountryRoleSuggestion(input: { desiredTitle?: string | null; keyword?: string | null }) {
  const desiredTitle = input.desiredTitle?.trim() ?? "";
  const keyword = input.keyword?.trim() ?? "";
  const roleProfile = getRoleProfile(desiredTitle);

  return {
    desiredTitle: roleProfile?.title ?? desiredTitle,
    keyword
  };
}
