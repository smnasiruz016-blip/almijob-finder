import { getTrustedSourcesForCountry } from "@/server/services/source-directory";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") ?? undefined;
  const sources = await getTrustedSourcesForCountry(country);

  return Response.json({ sources });
}
