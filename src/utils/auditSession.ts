/**
 * Compile-bound Problem Audit + CRE binding in one place.
 * IDELayout owns React re-render state; this module owns how that binding is built/cleared.
 */
import {
  computeProjectContentHash,
  type ProjectSourceFile,
} from './userData';
import { scanProjectFiles, type SecurityReport } from './securityScanner';
import {
  clearCreVerdictForHash,
  creAllowsLiveDeploy,
  getCachedCreVerdict,
  type CreAuditResult,
} from './creClient';

export interface AuditSession {
  files: ProjectSourceFile[];
  /** Active editor source at last successful compile bind. */
  activeSource: string | null;
  /** Canonical multi-file body bound to sourceHash (CRE audit payload). */
  auditSource: string | null;
  sourceHash: string | null;
  ideReport: SecurityReport | null;
}

export function emptyAuditSession(): AuditSession {
  return {
    files: [],
    activeSource: null,
    auditSource: null,
    sourceHash: null,
    ideReport: null,
  };
}

/** Clear compile/CRE binding (user edit or failed compile). Does not clear CRE cache. */
export function invalidateAuditSession(): AuditSession {
  return emptyAuditSession();
}

/**
 * Hash + project-wide Problem Audit after a successful compile.
 * Clears CRE verdicts for previous and new hashes so the gate cannot use a stale ALLOW.
 */
export async function buildAuditSessionFromCompile(
  files: ProjectSourceFile[],
  activeSource: string,
  prevHash?: string | null
): Promise<AuditSession> {
  const list =
    files.length > 0 ? files : ([{ name: 'Contract.sol', content: activeSource }] as ProjectSourceFile[]);
  const { hash, canonical } = await computeProjectContentHash(list);
  if (prevHash) clearCreVerdictForHash(prevHash);
  clearCreVerdictForHash(hash);
  const ideReport = scanProjectFiles(list);
  return {
    files: list,
    activeSource,
    auditSource: canonical,
    sourceHash: hash,
    ideReport,
  };
}

/** Restore a session from DB / file cache when content hash still matches. */
export function restoreAuditSession(input: {
  files?: ProjectSourceFile[];
  activeSource: string | null;
  auditSource: string | null;
  sourceHash: string | null;
  ideReport: SecurityReport | null;
}): AuditSession {
  return {
    files: input.files ?? [],
    activeSource: input.activeSource,
    auditSource: input.auditSource,
    sourceHash: input.sourceHash,
    ideReport: input.ideReport,
  };
}

export function getProblemAudit(session: AuditSession): SecurityReport | null {
  return session.ideReport;
}

export function getCreBinding(session: AuditSession): {
  sourceCode: string;
  sourceHash: string;
  ideReport: SecurityReport | null;
} | null {
  if (!session.sourceHash || !session.auditSource) return null;
  return {
    sourceCode: session.auditSource,
    sourceHash: session.sourceHash,
    ideReport: session.ideReport,
  };
}

export function allowsLiveDeploy(session: AuditSession) {
  return creAllowsLiveDeploy(session.sourceHash || '');
}

export function getSessionCreResult(session: AuditSession): CreAuditResult | null {
  if (!session.sourceHash) return null;
  return getCachedCreVerdict(session.sourceHash) || null;
}

/** Project-wide scan only (terminal / tooling). Prefer session.ideReport when hash-bound. */
export function runProblemAudit(files: ProjectSourceFile[]): SecurityReport {
  return scanProjectFiles(files);
}

export type AuditSessionCacheSlice = {
  lastCompiledSource: string | null;
  lastCompiledHash: string | null;
  lastCompiledAuditSource: string | null;
  securityReport: SecurityReport | null;
};

export function toCacheSlice(session: AuditSession): AuditSessionCacheSlice {
  return {
    lastCompiledSource: session.activeSource,
    lastCompiledHash: session.sourceHash,
    lastCompiledAuditSource: session.auditSource,
    securityReport: session.ideReport,
  };
}

export function fromCacheSlice(slice: AuditSessionCacheSlice | undefined): AuditSession {
  if (!slice) return emptyAuditSession();
  return restoreAuditSession({
    activeSource: slice.lastCompiledSource,
    auditSource: slice.lastCompiledAuditSource,
    sourceHash: slice.lastCompiledHash,
    ideReport: slice.securityReport,
  });
}
