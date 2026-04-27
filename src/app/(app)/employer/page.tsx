import { requireUser } from "@/lib/auth";
import { EmployerShell } from "@/components/dashboard/employer-shell";
import { getEmployerWorkspace } from "@/server/services/company-vacancies";

export default async function EmployerPage() {
  const user = await requireUser();
  const workspace = await getEmployerWorkspace(user.id);

  return <EmployerShell workspace={workspace} />;
}
