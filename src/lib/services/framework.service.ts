import { ObjectId } from "mongodb";

import { jobFamilyRepo } from "@/lib/db/repositories/job-family.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { questionRepo } from "@/lib/db/repositories/question.repository";
import { requiredLevelRepo } from "@/lib/db/repositories/required-level.repository";
import { auditService } from "@/lib/services/audit.service";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";
import type { Actor } from "@/lib/domain/types/common.types";
import type {
  CompetencyArea,
  JobFamily,
  Question,
  Role,
  SubCompetency,
} from "@/lib/domain/types/framework.types";
import type {
  CreateCompetencyAreaInput,
  CreateJobFamilyInput,
  CreateQuestionInput,
  CreateRoleInput,
  CreateSubCompetencyInput,
  RequiredLevelCellInput,
  UpdateCompetencyAreaInput,
  UpdateJobFamilyInput,
  UpdateQuestionInput,
  UpdateRoleInput,
  UpdateSubCompetencyInput,
} from "@/lib/domain/validation/framework.schema";

export interface FrameworkRoleColumn {
  id: string;
  name: string;
  code: string;
}

export interface FrameworkSubNode {
  id: string;
  code: string;
  name: string;
  questionCount: number;
  /** Required level keyed by role id (null when not applicable). */
  requiredByRole: Record<string, number | null>;
}

export interface FrameworkAreaNode {
  id: string;
  code: string;
  name: string;
  sequence: number;
  weight: number;
  subCompetencies: FrameworkSubNode[];
}

export interface FrameworkTree {
  jobFamily: { id: string; name: string; code: string } | null;
  roles: FrameworkRoleColumn[];
  areas: FrameworkAreaNode[];
  totals: { areas: number; subCompetencies: number; questions: number };
}

export interface ScopeQuestionNode {
  id: string;
  sequence: number;
  text: string;
}
export interface ScopeSubNode {
  id: string;
  code: string;
  name: string;
  questions: ScopeQuestionNode[];
}
export interface ScopeArea {
  id: string;
  code: string;
  name: string;
  subs: ScopeSubNode[];
}

export const frameworkService = {
  /**
   * Build the full framework tree for the active (first) job family:
   * areas → sub-competencies, with question counts and required levels per role.
   * Returns plain serializable objects (ObjectIds stringified).
   */
  async getFrameworkTree(jobFamilyId?: ObjectId): Promise<FrameworkTree> {
    const families = await jobFamilyRepo.findAll();
    const family =
      (jobFamilyId
        ? families.find((f) => f._id.equals(jobFamilyId))
        : families[0]) ??
      families[0] ??
      null;
    const roles = await roleRepo.findAll();

    if (!family) {
      return {
        jobFamily: null,
        roles: roles.map((r) => ({
          id: r._id.toString(),
          name: r.name,
          code: r.code,
        })),
        areas: [],
        totals: { areas: 0, subCompetencies: 0, questions: 0 },
      };
    }

    const areas = await competencyAreaRepo.findByJobFamily(family._id);

    // Gather all sub-competencies across areas.
    const subsByArea = await Promise.all(
      areas.map((a) => subCompetencyRepo.findByArea(a._id)),
    );
    const allSubs = subsByArea.flat();
    const allSubIds = allSubs.map((s) => s._id);

    const [questionCounts, requiredLevels] = await Promise.all([
      questionRepo.countsForSubs(allSubIds),
      requiredLevelRepo.findCurrentForSubs(allSubIds),
    ]);

    // Index required levels: subId → roleId → level
    const reqIndex = new Map<string, Map<string, number>>();
    for (const rl of requiredLevels) {
      const subKey = rl.subCompetencyId.toString();
      if (!reqIndex.has(subKey)) reqIndex.set(subKey, new Map());
      reqIndex.get(subKey)!.set(rl.roleId.toString(), rl.requiredLevel);
    }

    let questionTotal = 0;
    const areaNodes: FrameworkAreaNode[] = areas.map((area, i) => {
      const subs = subsByArea[i] ?? [];
      const subNodes: FrameworkSubNode[] = subs.map((sub) => {
        const subKey = sub._id.toString();
        const qCount = questionCounts.get(subKey) ?? 0;
        questionTotal += qCount;
        const roleMap = reqIndex.get(subKey);
        const requiredByRole: Record<string, number | null> = {};
        for (const role of roles) {
          requiredByRole[role._id.toString()] =
            roleMap?.get(role._id.toString()) ?? null;
        }
        return {
          id: subKey,
          code: sub.code,
          name: sub.name,
          questionCount: qCount,
          requiredByRole,
        };
      });
      return {
        id: area._id.toString(),
        code: area.code,
        name: area.name,
        sequence: area.sequence,
        weight: area.weight,
        subCompetencies: subNodes,
      };
    });

    return {
      jobFamily: {
        id: family._id.toString(),
        name: family.name,
        code: family.code,
      },
      roles: roles.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        code: r.code,
      })),
      areas: areaNodes,
      totals: {
        areas: areaNodes.length,
        subCompetencies: allSubs.length,
        questions: questionTotal,
      },
    };
  },

  /**
   * Areas → sub-competencies → questions (ids + labels only) for a job family.
   * Used by the campaign builder's test-scope selector.
   */
  async getScopeTree(jobFamilyId?: ObjectId): Promise<ScopeArea[]> {
    const families = await jobFamilyRepo.findAll();
    const family =
      (jobFamilyId
        ? families.find((f) => f._id.equals(jobFamilyId))
        : families[0]) ??
      families[0] ??
      null;
    if (!family) return [];

    const areas = await competencyAreaRepo.findByJobFamily(family._id);
    const subsByArea = await Promise.all(
      areas.map((a) => subCompetencyRepo.findByArea(a._id)),
    );
    const allSubs = subsByArea.flat();
    const questions = await questionRepo.findBySubs(allSubs.map((s) => s._id));
    const qBySub = new Map<string, typeof questions>();
    for (const q of questions) {
      const k = q.subCompetencyId.toString();
      if (!qBySub.has(k)) qBySub.set(k, []);
      qBySub.get(k)!.push(q);
    }

    return areas.map((area, i) => ({
      id: area._id.toString(),
      code: area.code,
      name: area.name,
      subs: (subsByArea[i] ?? []).map((sub) => ({
        id: sub._id.toString(),
        code: sub.code,
        name: sub.name,
        questions: (qBySub.get(sub._id.toString()) ?? []).map((q) => ({
          id: q._id.toString(),
          sequence: q.sequence,
          text: q.text,
        })),
      })),
    }));
  },

  /** The default (first) job family, creating none. */
  async getDefaultJobFamily() {
    const families = await jobFamilyRepo.findAll();
    return families[0] ?? null;
  },

  /* ----------------------------- Job Families --------------------------- */

  async listJobFamilies(): Promise<JobFamily[]> {
    return jobFamilyRepo.findAll();
  },

  async createJobFamily(
    input: CreateJobFamilyInput,
    actor: Actor,
  ): Promise<JobFamily> {
    const existing = await jobFamilyRepo.findByCode(input.code);
    if (existing) {
      throw new ConflictError(`A job family with code "${input.code}" already exists`);
    }
    const now = new Date();
    const family = await jobFamilyRepo.insert({
      name: input.name,
      code: input.code,
      description: input.description ?? null,
      version: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.jobFamily.created",
      entityType: "JobFamily",
      entityId: family._id,
      before: null,
      after: { name: family.name, code: family.code },
    });
    return family;
  },

  async updateJobFamily(
    id: ObjectId,
    input: UpdateJobFamilyInput,
    actor: Actor,
  ): Promise<JobFamily> {
    const current = await jobFamilyRepo.findById(id);
    if (!current) throw new NotFoundError("Job family");
    if (input.code !== current.code) {
      const clash = await jobFamilyRepo.findByCode(input.code);
      if (clash && !clash._id.equals(id)) {
        throw new ConflictError(`Code "${input.code}" is already in use`);
      }
    }
    const updated = await jobFamilyRepo.update(id, {
      name: input.name,
      code: input.code,
      description: input.description ?? null,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    if (!updated) throw new NotFoundError("Job family");
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.jobFamily.updated",
      entityType: "JobFamily",
      entityId: id,
      before: { name: current.name, code: current.code },
      after: { name: updated.name, code: updated.code },
    });
    return updated;
  },

  async archiveJobFamily(id: ObjectId, actor: Actor): Promise<void> {
    const current = await jobFamilyRepo.findById(id);
    if (!current) throw new NotFoundError("Job family");
    const areas = await competencyAreaRepo.findByJobFamily(id);
    if (areas.length > 0) {
      throw new ConflictError(
        "Archive or move the competency areas in this job family first",
      );
    }
    await jobFamilyRepo.update(id, {
      status: "archived",
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.jobFamily.archived",
      entityType: "JobFamily",
      entityId: id,
      before: { status: current.status },
      after: { status: "archived" },
    });
  },

  /* ------------------------------- Areas -------------------------------- */

  async createArea(
    input: CreateCompetencyAreaInput,
    actor: Actor,
  ): Promise<CompetencyArea> {
    const existing = await competencyAreaRepo.findByCode(
      input.jobFamilyId,
      input.code,
    );
    if (existing) {
      throw new ConflictError(
        `An area with code "${input.code}" already exists in this job family`,
      );
    }
    const now = new Date();
    const area = await competencyAreaRepo.insert({
      jobFamilyId: input.jobFamilyId,
      name: input.name,
      code: input.code,
      description: input.description ?? null,
      sequence: input.sequence,
      weight: input.weight,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.area.created",
      entityType: "CompetencyArea",
      entityId: area._id,
      before: null,
      after: { name: area.name, code: area.code },
    });
    return area;
  },

  async updateArea(
    id: ObjectId,
    input: UpdateCompetencyAreaInput,
    actor: Actor,
  ): Promise<CompetencyArea> {
    const current = await competencyAreaRepo.findById(id);
    if (!current) throw new NotFoundError("Competency area");
    if (input.code !== current.code) {
      const clash = await competencyAreaRepo.findByCode(
        current.jobFamilyId,
        input.code,
      );
      if (clash && !clash._id.equals(id)) {
        throw new ConflictError(`Code "${input.code}" is already in use`);
      }
    }
    const updated = await competencyAreaRepo.update(id, {
      name: input.name,
      code: input.code,
      description: input.description ?? null,
      sequence: input.sequence,
      weight: input.weight,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    if (!updated) throw new NotFoundError("Competency area");
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.area.updated",
      entityType: "CompetencyArea",
      entityId: id,
      before: { name: current.name, code: current.code },
      after: { name: updated.name, code: updated.code },
    });
    return updated;
  },

  async archiveArea(id: ObjectId, actor: Actor): Promise<void> {
    const current = await competencyAreaRepo.findById(id);
    if (!current) throw new NotFoundError("Competency area");
    const subs = await subCompetencyRepo.findByArea(id);
    if (subs.length > 0) {
      throw new ConflictError(
        "Archive or move the sub-competencies in this area first",
      );
    }
    await competencyAreaRepo.update(id, {
      isActive: false,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.area.deactivated",
      entityType: "CompetencyArea",
      entityId: id,
      before: { isActive: true },
      after: { isActive: false },
    });
  },

  /* --------------------------- Sub-Competencies ------------------------- */

  async listAreaWithSubs(areaId: ObjectId): Promise<{
    area: CompetencyArea;
    subs: Array<SubCompetency & { questionCount: number }>;
  }> {
    const area = await competencyAreaRepo.findById(areaId);
    if (!area) throw new NotFoundError("Competency area");
    const subs = await subCompetencyRepo.findByArea(areaId);
    const counts = await questionRepo.countsForSubs(subs.map((s) => s._id));
    return {
      area,
      subs: subs.map((s) => ({
        ...s,
        questionCount: counts.get(s._id.toString()) ?? 0,
      })),
    };
  },

  async createSubCompetency(
    input: CreateSubCompetencyInput,
    actor: Actor,
  ): Promise<SubCompetency> {
    const existing = await subCompetencyRepo.findByCode(input.areaId, input.code);
    if (existing) {
      throw new ConflictError(
        `A sub-competency with code "${input.code}" already exists in this area`,
      );
    }
    const now = new Date();
    const sub = await subCompetencyRepo.insert({
      areaId: input.areaId,
      name: input.name,
      code: input.code,
      description: input.description ?? null,
      behavioralIndicators: input.behavioralIndicators,
      sequence: input.sequence,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.subCompetency.created",
      entityType: "SubCompetency",
      entityId: sub._id,
      before: null,
      after: { name: sub.name, code: sub.code },
    });
    return sub;
  },

  async updateSubCompetency(
    id: ObjectId,
    input: UpdateSubCompetencyInput,
    actor: Actor,
  ): Promise<SubCompetency> {
    const current = await subCompetencyRepo.findById(id);
    if (!current) throw new NotFoundError("Sub-competency");
    if (input.code !== current.code) {
      const clash = await subCompetencyRepo.findByCode(current.areaId, input.code);
      if (clash && !clash._id.equals(id)) {
        throw new ConflictError(`Code "${input.code}" is already in use`);
      }
    }
    const updated = await subCompetencyRepo.update(id, {
      name: input.name,
      code: input.code,
      description: input.description ?? null,
      behavioralIndicators: input.behavioralIndicators,
      sequence: input.sequence,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    if (!updated) throw new NotFoundError("Sub-competency");
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.subCompetency.updated",
      entityType: "SubCompetency",
      entityId: id,
      before: { name: current.name, code: current.code },
      after: { name: updated.name, code: updated.code },
    });
    return updated;
  },

  async archiveSubCompetency(id: ObjectId, actor: Actor): Promise<void> {
    const current = await subCompetencyRepo.findById(id);
    if (!current) throw new NotFoundError("Sub-competency");
    const questions = await questionRepo.findBySubCompetency(id);
    if (questions.length > 0) {
      throw new ConflictError("Archive the questions under this sub-competency first");
    }
    const reqCount = await requiredLevelRepo.countCurrentForSub(id);
    if (reqCount > 0) {
      throw new ConflictError("Clear the required levels for this sub-competency first");
    }
    await subCompetencyRepo.update(id, {
      isActive: false,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.subCompetency.deactivated",
      entityType: "SubCompetency",
      entityId: id,
      before: { isActive: true },
      after: { isActive: false },
    });
  },

  /* ------------------------------- Questions ---------------------------- */

  async listSubWithQuestions(subId: ObjectId): Promise<{
    sub: SubCompetency;
    questions: Question[];
  }> {
    const sub = await subCompetencyRepo.findById(subId);
    if (!sub) throw new NotFoundError("Sub-competency");
    const questions = await questionRepo.findBySubCompetency(subId);
    return { sub, questions };
  },

  async createQuestion(
    input: CreateQuestionInput,
    actor: Actor,
  ): Promise<Question> {
    const now = new Date();
    const question = await questionRepo.insert({
      subCompetencyId: input.subCompetencyId,
      text: input.text,
      options: input.options,
      weight: input.weight,
      sequence: input.sequence,
      isActive: true,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.question.created",
      entityType: "Question",
      entityId: question._id,
      before: null,
      after: { text: question.text, options: question.options.length },
    });
    return question;
  },

  async updateQuestion(
    id: ObjectId,
    input: UpdateQuestionInput,
    actor: Actor,
  ): Promise<Question> {
    const current = await questionRepo.findById(id);
    if (!current) throw new NotFoundError("Question");
    const updated = await questionRepo.update(id, {
      text: input.text,
      options: input.options,
      weight: input.weight,
      sequence: input.sequence,
      // Bump version so already-submitted answers keep referencing the old one.
      version: current.version + 1,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    if (!updated) throw new NotFoundError("Question");
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.question.updated",
      entityType: "Question",
      entityId: id,
      before: { version: current.version },
      after: { version: updated.version },
    });
    return updated;
  },

  async archiveQuestion(id: ObjectId, actor: Actor): Promise<void> {
    const current = await questionRepo.findById(id);
    if (!current) throw new NotFoundError("Question");
    await questionRepo.update(id, {
      isActive: false,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.question.deactivated",
      entityType: "Question",
      entityId: id,
      before: { isActive: true },
      after: { isActive: false },
    });
  },

  /* --------------------------------- Roles ------------------------------ */

  async listRoles(): Promise<Role[]> {
    return roleRepo.findAll();
  },

  async createRole(input: CreateRoleInput, actor: Actor): Promise<Role> {
    const existing = await roleRepo.findByCode(input.code);
    if (existing) {
      throw new ConflictError(`A role with code "${input.code}" already exists`);
    }
    const now = new Date();
    const role = await roleRepo.insert({
      name: input.name,
      code: input.code,
      level: input.level,
      description: input.description ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.role.created",
      entityType: "Role",
      entityId: role._id,
      before: null,
      after: { name: role.name, code: role.code },
    });
    return role;
  },

  async updateRole(
    id: ObjectId,
    input: UpdateRoleInput,
    actor: Actor,
  ): Promise<Role> {
    const current = await roleRepo.findById(id);
    if (!current) throw new NotFoundError("Role");
    if (input.code !== current.code) {
      const clash = await roleRepo.findByCode(input.code);
      if (clash && !clash._id.equals(id)) {
        throw new ConflictError(`Code "${input.code}" is already in use`);
      }
    }
    const updated = await roleRepo.update(id, {
      name: input.name,
      code: input.code,
      level: input.level,
      description: input.description ?? null,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    if (!updated) throw new NotFoundError("Role");
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.role.updated",
      entityType: "Role",
      entityId: id,
      before: { name: current.name, code: current.code },
      after: { name: updated.name, code: updated.code },
    });
    return updated;
  },

  async archiveRole(id: ObjectId, actor: Actor): Promise<void> {
    const current = await roleRepo.findById(id);
    if (!current) throw new NotFoundError("Role");
    await roleRepo.update(id, {
      isActive: false,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "framework.role.deactivated",
      entityType: "Role",
      entityId: id,
      before: { isActive: true },
      after: { isActive: false },
    });
  },

  /* ---------------------------- Required Levels ------------------------- */

  /**
   * Persist a batch of required-level edits. For each cell that differs from
   * the current value, the old row is closed (effectiveTo set) and a new row
   * is created (SCHEMA.md §7) so historical assessments stay reproducible.
   */
  async saveRequiredLevels(
    cells: RequiredLevelCellInput[],
    actor: Actor,
  ): Promise<{ changed: number }> {
    const now = new Date();
    let changed = 0;
    for (const cell of cells) {
      const current = await requiredLevelRepo.findCurrent(
        cell.subCompetencyId,
        cell.roleId,
      );
      if (current && current.requiredLevel === cell.requiredLevel) continue;
      if (current) {
        await requiredLevelRepo.closeCurrent(
          cell.subCompetencyId,
          cell.roleId,
          now,
          actor.id,
        );
      }
      await requiredLevelRepo.insert({
        subCompetencyId: cell.subCompetencyId,
        roleId: cell.roleId,
        requiredLevel: cell.requiredLevel,
        effectiveFrom: now,
        effectiveTo: null,
        createdAt: now,
        updatedAt: now,
        createdBy: actor.id,
        updatedBy: actor.id,
      });
      changed += 1;
    }
    if (changed > 0) {
      await auditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        action: "requiredLevel.updated",
        entityType: "RequiredLevel",
        entityId: null,
        after: { cellsChanged: changed },
      });
    }
    return { changed };
  },
};
