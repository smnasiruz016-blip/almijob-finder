import { parseResumeText } from "@/server/parsers/resume-parser";

describe("parseResumeText", () => {
  it("extracts identity and keyword signals from resume text", () => {
    const parsed = parseResumeText(`
      Jordan Rivera
      jordan@example.com
      (555) 111-2222

      Skills: TypeScript, React, Prisma, SQL
      Experience: Built dashboards, led design system adoption, improved analytics workflow
      Education: BS Computer Science
      Seeking a frontend engineer or product engineer role
    `);

    expect(parsed.name).toBe("Jordan Rivera");
    expect(parsed.email).toBe("jordan@example.com");
    expect(parsed.phone).toContain("555");
    expect(parsed.skills).toContain("TypeScript");
    expect(parsed.experienceKeywords).toContain("Analytics");
    expect(parsed.educationKeywords.join(" ").toLowerCase()).toContain("computer science");
    expect(parsed.preferredRoles.map((role) => role.toLowerCase())).toContain("frontend engineer");
  });
});
