declare module '@cre/ide-reconcile' {
  export function reconcileAllowWithIdeHighs<T extends { verdict?: string | null; gateable?: boolean }>(
    result: T,
    highCount: number
  ): T & { ideReconciled?: boolean; verdictCode?: number; reason?: string };

  export function formatSafetyScorePercent(score: number | null | undefined): string;
}
