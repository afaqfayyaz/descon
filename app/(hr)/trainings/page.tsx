import { requirePermission } from "@/lib/auth/permissions";
import { trainingService } from "@/lib/services/training.service";
import { frameworkService } from "@/lib/services/framework.service";
import { userRepo } from "@/lib/db/repositories/user.repository";
import {
  TrainingsManager,
  type Option,
} from "@/components/features/trainings/trainings-manager";

export default async function TrainingsPage() {
  await requirePermission("training.manage");

  const [trainings, tree, users] = await Promise.all([
    trainingService.listView(),
    frameworkService.getFrameworkTree(),
    userRepo.findMany({}, { page: 1, limit: 500 }),
  ]);

  const subCompetencies: Option[] = [];
  for (const area of tree.areas) {
    for (const sub of area.subCompetencies) {
      subCompetencies.push({ id: sub.id, label: `${sub.code} ${sub.name}` });
    }
  }
  const employees: Option[] = users.map((u) => ({
    id: u._id.toString(),
    label: `${u.fullName} (${u.employeeCode})`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Training Catalog</h1>
        <p className="text-sm text-slate-500">
          Maintain development activities and assign them to employees.
        </p>
      </div>

      <TrainingsManager
        trainings={trainings}
        subCompetencies={subCompetencies}
        employees={employees}
      />
    </div>
  );
}
