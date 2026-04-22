import type { ParsedResume } from "@/types";

export function buildProfileInsights(resume: ParsedResume | null) {
  if (!resume) {
    return {
      completenessScore: 18,
      strengths: ["Create an account profile by uploading a resume."],
      gaps: ["No parsed skills yet", "No preferred roles detected", "No experience keywords available"]
    };
  }

  let score = 30;
  if (resume.name) score += 10;
  if (resume.email) score += 10;
  if (resume.phone) score += 5;
  score += Math.min(20, resume.skills.length * 2);
  score += Math.min(15, resume.experienceKeywords.length * 2);
  score += Math.min(10, resume.educationKeywords.length * 2);
  score += Math.min(10, resume.preferredRoles.length * 3);

  const strengths = [
    resume.skills.length ? `${resume.skills.length} skills parsed` : null,
    resume.preferredRoles.length ? `${resume.preferredRoles.length} role targets detected` : null,
    resume.experienceKeywords.length ? `${resume.experienceKeywords.length} experience signals captured` : null
  ].filter(Boolean) as string[];

  const gaps = [
    resume.skills.length < 6 ? "Add more tools and skill keywords to your resume" : null,
    resume.preferredRoles.length < 2 ? "State target roles explicitly in your summary" : null,
    resume.experienceKeywords.length < 4 ? "Use stronger experience bullets with domain keywords" : null
  ].filter(Boolean) as string[];

  return {
    completenessScore: Math.min(100, score),
    strengths,
    gaps
  };
}
