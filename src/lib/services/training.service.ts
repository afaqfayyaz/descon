import { ObjectId } from "mongodb";

import { trainingRepo } from "@/lib/db/repositories/training.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { auditService } from "@/lib/services/audit.service";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";
import type { Actor } from "@/lib/domain/types/common.types";
import type { Training } from "@/lib/domain/types/training.types";
import type {
  AssignTrainingInput,
  CreateTrainingInput,
  UpdateAssignmentStatusInput,
  UpdateTrainingInput,
} from "@/lib/domain/validation/training.schema";

export interface TrainingAssignmentView {
  employeeId: string;
  employeeName: string;
  assignedAt: string;
  dueDate: string | null;
  status: string;
  notes: string | null;
}

export interface TrainingView {
  id: string;
  name: string;
  description: string | null;
  type: string;
  durationHours: number | null;
  provider: string | null;
  url: string | null;
  addressesSubCompetencies: string[];
  addressesLabels: string[];
  assignments: TrainingAssignmentView[];
}

export const trainingService = {
  async listView(): Promise<TrainingView[]> {
    const trainings = await trainingRepo.findActive();

    const subIds = unique(
      trainings.flatMap((t) => t.addressesSubCompetencies),
    );
    const empIds = unique(
      trainings.flatMap((t) => t.assignments.map((a) => a.employeeId)),
    );
    const [subs, emps] = await Promise.all([
      subCompetencyRepo.findByIds(subIds),
      userRepo.findManyByIds(empIds),
    ]);
    const subMap = new Map(subs.map((s) => [s._id.toString(), `${s.code} ${s.name}`]));
    const empMap = new Map(emps.map((e) => [e._id.toString(), e.fullName]));

    return trainings.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description,
      type: t.type,
      durationHours: t.durationHours,
      provider: t.provider,
      url: t.url,
      addressesSubCompetencies: t.addressesSubCompetencies.map((s) =>
        s.toString(),
      ),
      addressesLabels: t.addressesSubCompetencies.map(
        (s) => subMap.get(s.toString()) ?? s.toString(),
      ),
      assignments: t.assignments.map((a) => ({
        employeeId: a.employeeId.toString(),
        employeeName: empMap.get(a.employeeId.toString()) ?? "Unknown",
        assignedAt: a.assignedAt.toISOString(),
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
        status: a.status,
        notes: a.notes,
      })),
    }));
  },

  async create(input: CreateTrainingInput, actor: Actor): Promise<Training> {
    const now = new Date();
    const training = await trainingRepo.insert({
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      durationHours: input.durationHours ?? null,
      provider: input.provider ?? null,
      url: input.url ?? null,
      addressesSubCompetencies: input.addressesSubCompetencies,
      isActive: true,
      assignments: [],
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "training.created",
      entityType: "Training",
      entityId: training._id,
      before: null,
      after: { name: training.name, type: training.type },
    });
    return training;
  },

  async update(
    id: ObjectId,
    input: UpdateTrainingInput,
    actor: Actor,
  ): Promise<Training> {
    const current = await trainingRepo.findById(id);
    if (!current) throw new NotFoundError("Training");
    const updated = await trainingRepo.update(id, {
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      durationHours: input.durationHours ?? null,
      provider: input.provider ?? null,
      url: input.url ?? null,
      addressesSubCompetencies: input.addressesSubCompetencies,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    if (!updated) throw new NotFoundError("Training");
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "training.updated",
      entityType: "Training",
      entityId: id,
      before: { name: current.name },
      after: { name: updated.name },
    });
    return updated;
  },

  async archive(id: ObjectId, actor: Actor): Promise<void> {
    const current = await trainingRepo.findById(id);
    if (!current) throw new NotFoundError("Training");
    await trainingRepo.update(id, {
      isActive: false,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "training.updated",
      entityType: "Training",
      entityId: id,
      before: { isActive: true },
      after: { isActive: false },
    });
  },

  async assign(input: AssignTrainingInput, actor: Actor): Promise<void> {
    const training = await trainingRepo.findById(input.trainingId);
    if (!training) throw new NotFoundError("Training");
    const employee = await userRepo.findById(input.employeeId);
    if (!employee) throw new NotFoundError("Employee");

    const already = training.assignments.some(
      (a) =>
        a.employeeId.equals(input.employeeId) &&
        a.status !== "cancelled" &&
        a.status !== "completed",
    );
    if (already) {
      throw new ConflictError(`${employee.fullName} is already assigned this training`);
    }

    await trainingRepo.pushAssignment(
      input.trainingId,
      {
        employeeId: input.employeeId,
        assignedAt: new Date(),
        assignedBy: actor.id,
        dueDate: input.dueDate ?? null,
        status: "assigned",
        completedAt: null,
        notes: input.notes ?? null,
      },
      actor.id,
    );
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "training.assigned",
      entityType: "Training",
      entityId: input.trainingId,
      after: { employeeId: input.employeeId.toString() },
    });
  },

  async setAssignmentStatus(
    input: UpdateAssignmentStatusInput,
    actor: Actor,
  ): Promise<void> {
    const completedAt = input.status === "completed" ? new Date() : null;
    await trainingRepo.setAssignmentStatus(
      input.trainingId,
      input.employeeId,
      input.assignedAt,
      input.status,
      completedAt,
      actor.id,
    );
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: input.status === "completed" ? "training.completed" : "training.assigned",
      entityType: "Training",
      entityId: input.trainingId,
      after: { employeeId: input.employeeId.toString(), status: input.status },
    });
  },
};

function unique(ids: ObjectId[]): ObjectId[] {
  const seen = new Set<string>();
  const out: ObjectId[] = [];
  for (const id of ids) {
    const key = id.toString();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(id);
    }
  }
  return out;
}
