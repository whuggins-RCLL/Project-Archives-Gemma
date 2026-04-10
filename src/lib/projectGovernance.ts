import { ApprovalCheckpoint, Milestone, Project, PROJECT_STAGE_SEQUENCE } from '../types';

function stageIdPrefix(stage: string): string {
  return stage.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function buildDefaultMilestones(): Milestone[] {
  return PROJECT_STAGE_SEQUENCE.map((stage, index) => ({
    id: `ms-${index + 1}`,
    title: `${stage} milestone`,
    stage,
    status: index === 0 ? 'In Progress' : 'Not Started'
  }));
}

export function buildDefaultApprovalCheckpoints(): ApprovalCheckpoint[] {
  return PROJECT_STAGE_SEQUENCE.map((stage) => ({
    id: `ap-${stageIdPrefix(stage)}`,
    stage,
    name: `${stage} gate approval`,
    required: true,
    approved: false
  }));
}

export function withGovernanceDefaults(project: Project): Project {
  return {
    ...project,
    milestones: project.milestones ?? buildDefaultMilestones(),
    dependencies: project.dependencies ?? [],
    approvalCheckpoints: project.approvalCheckpoints ?? buildDefaultApprovalCheckpoints(),
    aiDrafts: project.aiDrafts ?? []
  };
}
