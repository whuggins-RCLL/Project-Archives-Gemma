import { Metrics, Project, ProjectStatus } from '../types';

type TimestampLike =
  | string
  | number
  | Date
  | { toDate?: () => Date; seconds?: number; nanoseconds?: number }
  | null
  | undefined;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toDate(value: TimestampLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      const parsed = value.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value.seconds === 'number') {
      const parsed = new Date((value.seconds * 1000) + ((value.nanoseconds || 0) / 1e6));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY));
}

function percentageDelta(current: number, baseline: number): number {
  if (baseline <= 0) return current > 0 ? 100 : 0;
  return ((current - baseline) / baseline) * 100;
}

function getRiskLevel(score: number): 'Low' | 'Medium' | 'High' {
  if (score >= 65) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

export function buildPortfolioMetrics(projects: Project[]): Metrics {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in14Days = new Date(startOfToday);
  in14Days.setDate(in14Days.getDate() + 14);

  const startCurrent30 = new Date(startOfToday);
  startCurrent30.setDate(startCurrent30.getDate() - 30);

  const startPrev30 = new Date(startCurrent30);
  startPrev30.setDate(startPrev30.getDate() - 30);

  const projectsByStatus = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<ProjectStatus, number>);

  const activeProjects = projects.filter((p) => p.status !== 'Launched');

  const withDerivedSignals = activeProjects.map((project) => {
    const createdAt = toDate(project.createdAt);
    const updatedAt = toDate(project.updatedAt) ?? createdAt;
    const dueDate = toDate(project.dueDate);

    const ageDays = createdAt ? daysBetween(createdAt, now) : 0;
    const staleDays = updatedAt ? daysBetween(updatedAt, now) : 0;
    const isOverdue = !!dueDate && dueDate < startOfToday;
    const atRiskSoon = !!dueDate && dueDate >= startOfToday && dueDate <= in14Days && project.progress < 70;
    const criticalMilestone = isOverdue ? project.progress < 100 : atRiskSoon;

    return {
      project,
      ageDays,
      staleDays,
      isOverdue,
      criticalMilestone,
      staleBreach: staleDays > 30,
    };
  });

  const slaBreaches = withDerivedSignals.filter((p) => p.isOverdue || p.staleBreach).length;
  const criticalMilestonesPending = withDerivedSignals.filter((p) => p.criticalMilestone).length;

  const averageAgeDays = withDerivedSignals.length > 0
    ? Math.round(withDerivedSignals.reduce((sum, p) => sum + p.ageDays, 0) / withDerivedSignals.length)
    : 0;

  const weightedRiskScore = withDerivedSignals.length > 0
    ? withDerivedSignals.reduce((sum, p) => {
      const baseRisk = p.project.riskFactor === 'High' ? 25 : p.project.riskFactor === 'Medium' ? 12 : 4;
      const ageRisk = Math.min(20, p.ageDays / 6);
      const overdueRisk = p.isOverdue ? 25 : 0;
      const staleRisk = p.staleBreach ? 15 : 0;
      const criticalRisk = p.criticalMilestone ? 15 : 0;
      return sum + baseRisk + ageRisk + overdueRisk + staleRisk + criticalRisk;
    }, 0) / withDerivedSignals.length
    : 0;

  const riskLevel = getRiskLevel(weightedRiskScore);

  const currentIntake = projects.filter((p) => {
    const createdAt = toDate(p.createdAt);
    return createdAt ? createdAt >= startCurrent30 && createdAt <= now : false;
  }).length;

  const baselineIntake = projects.filter((p) => {
    const createdAt = toDate(p.createdAt);
    return createdAt ? createdAt >= startPrev30 && createdAt < startCurrent30 : false;
  }).length;

  const intakeTrendPercent = percentageDelta(currentIntake, baselineIntake);

  return {
    totalRecords: projects.length,
    riskLevel,
    activeProjects: activeProjects.length,
    projectsByStatus,
    criticalMilestonesPending,
    slaBreaches,
    averageProjectAgeDays: averageAgeDays,
    intakeTrendPercent,
    baselineLabel: '30-day intake baseline',
  };
}
