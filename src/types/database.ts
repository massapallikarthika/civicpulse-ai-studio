/**
 * Canonical Database Types for CivicPulse
 * Matches PostgreSQL schema exactly
 */

export interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ward {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type ComplaintCategory =
  | 'Water Supply'
  | 'Sanitation'
  | 'Roads & Lighting'
  | 'Healthcare'
  | 'Public Safety'
  | 'Other';

export type ComplaintPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type ComplaintStatus =
  | 'Open'
  | 'Acknowledged'
  | 'In Progress'
  | 'Resolved'
  | 'Closed';

export interface Complaint {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: ComplaintCategory;
  ward_id: string | null;
  responsible_department: string | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  wards?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

export type ProjectStatus =
  | 'Planning'
  | 'In Progress'
  | 'Delayed'
  | 'Completed'
  | 'On Hold';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  department: string | null;
  ward_id: string | null;
  budget: number;
  amount_spent: number;
  progress: number;
  status: ProjectStatus;
  planned_deadline: string | null;
  created_at: string;
  updated_at: string;
  wards?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

export type ServiceStatus =
  | 'Active'
  | 'Needs Improvement'
  | 'Degraded'
  | 'Offline';

export interface Service {
  id: string;
  user_id: string;
  ward_id: string | null;
  service_type: string;
  coverage_percentage: number;
  satisfaction_percentage: number;
  status: ServiceStatus;
  reporting_period: string | null;
  created_at: string;
  updated_at: string;
  wards?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

export interface Resource {
  id: string;
  user_id: string;
  department: string;
  allocation_name: string;
  allocated_amount: number;
  spent_amount: number;
  fiscal_year: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type InsightType = 'recommendation' | 'alert' | 'performance';
export type InsightSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

export interface AIInsight {
  id: string;
  user_id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: InsightSeverity;
  recommendation: string;
  source_context: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  user_id: string;
  event_type: string;
  description: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

export interface AIRun {
  id: string;
  user_id: string;
  input_context: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  created_at: string;
}

export interface AIUsageWindow {
  id: string;
  user_id: string;
  window_start: string;
  request_count: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  openComplaintsCount: number;
  activeProjectsCount: number;
  totalAllocatedBudget: number;
  totalSpentBudget: number;
  budgetRemaining: number;
  averageServiceCoverage: number;
  averageSatisfaction: number;
  wardCount: number;
  wardPerformance: Array<{
    wardId: string;
    wardName: string;
    wardCode: string | null;
    openComplaints: number;
    activeProjects: number;
    avgCoverage: number;
  }>;
  resourcePosition: Array<{
    department: string;
    allocated: number;
    spent: number;
    remaining: number;
    utilizationPercent: number;
  }>;
  recentActivity: ActivityEvent[];
}
