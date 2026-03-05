import { z } from 'zod';

export const ChatRequestSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().min(1).max(10000),
  attachments: z.array(z.object({
    type: z.literal('pdf'),
    url: z.string().url(),
  })).optional(),
});

export const ExecuteRequestSchema = z.object({
  projectId: z.string().uuid(),
  planId: z.string().uuid(),
});

export const SynthesizeRequestSchema = z.object({
  projectId: z.string().uuid(),
});

export const CreateProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const CancelExecutionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('cancel'),
    projectId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('skip_and_synthesize'),
    projectId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('mark_job_failed'),
    projectId: z.string().uuid(),
    jobId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('retry_failed'),
    projectId: z.string().uuid(),
    planId: z.string().uuid(),
  }),
]);

export const CreateCultureWireSearchSchema = z.object({
  brandName: z.string().min(1).max(200),
  geo: z.string().length(2).default('AU'),
  timeWindowHours: z.number().min(1).max(168).default(24),
  platforms: z.array(z.string()).min(1).max(6).default(['reddit', 'tiktok', 'youtube', 'instagram']),
});

export const TriggerAnalysisSchema = z.object({
  searchId: z.string().uuid(),
});
