export const queryKeys = {
  dashboard: ['portal', 'dashboard'] as const,
  invoices: ['portal', 'invoices'] as const,
  files: ['portal', 'files'] as const,
  contracts: ['portal', 'contracts'] as const,
  conversations: ['portal', 'conversations'] as const,
  messages: ['portal', 'messages'] as const,
  providers: ['portal', 'providers'] as const,
  activities: ['portal', 'activities'] as const,
  jobs: ['portal', 'jobs'] as const,
  jobReview: (jobId: string) => ['portal', 'jobs', jobId, 'review'] as const,
};
