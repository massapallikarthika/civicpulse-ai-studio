import { z } from 'zod';

export const WardSchema = z.object({
  name: z.string().trim().min(1, 'Ward name is required').max(100, 'Ward name too long'),
  code: z.string().trim().max(50).optional().nullable(),
  description: z.string().trim().optional().nullable(),
});

export const ComplaintSchema = z.object({
  title: z.string().trim().min(1, 'Complaint title is required').max(200),
  description: z.string().trim().optional().nullable(),
  category: z.enum([
    'Water Supply',
    'Sanitation',
    'Roads & Lighting',
    'Healthcare',
    'Public Safety',
    'Other',
  ]),
  ward_id: z.string().uuid().optional().nullable().or(z.literal('')),
  responsible_department: z.string().trim().optional().nullable(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium'),
  status: z.enum(['Open', 'Acknowledged', 'In Progress', 'Resolved', 'Closed']).default('Open'),
});

export const ProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(200),
  department: z.string().trim().optional().nullable(),
  ward_id: z.string().uuid().optional().nullable().or(z.literal('')),
  budget: z.coerce.number().min(0, 'Budget must be non-negative'),
  amount_spent: z.coerce.number().min(0, 'Spent amount must be non-negative'),
  progress: z.coerce.number().min(0, 'Progress must be at least 0').max(100, 'Progress cannot exceed 100'),
  status: z.enum(['Planning', 'In Progress', 'Delayed', 'Completed', 'On Hold']).default('Planning'),
  planned_deadline: z.string().optional().nullable(),
});

export const ServiceSchema = z.object({
  ward_id: z.string().uuid().optional().nullable().or(z.literal('')),
  service_type: z.string().trim().min(1, 'Service type is required').max(100),
  coverage_percentage: z.coerce.number().min(0).max(100, 'Coverage percentage must be between 0 and 100'),
  satisfaction_percentage: z.coerce.number().min(0).max(100, 'Satisfaction percentage must be between 0 and 100'),
  status: z.enum(['Active', 'Needs Improvement', 'Degraded', 'Offline']).default('Active'),
  reporting_period: z.string().trim().optional().nullable(),
});

export const ResourceSchema = z.object({
  department: z.string().trim().min(1, 'Department is required').max(100),
  allocation_name: z.string().trim().min(1, 'Allocation name is required').max(200),
  allocated_amount: z.coerce.number().min(0, 'Allocated amount must be non-negative'),
  spent_amount: z.coerce.number().min(0, 'Spent amount must be non-negative'),
  fiscal_year: z.string().trim().min(1, 'Fiscal year is required'),
  currency: z.string().trim().default('INR'),
});

export const ProfileUpdateSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(100),
});
