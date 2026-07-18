export interface SourceLocation {
  offset: number;
  length: number;
  fileIndex: number;
  jumpType: string;
}

export interface LineMap {
  line: number;
  column: number;
}

/**
 * Describes the quality of a heatmap result so callers can surface
 * the right UI message instead of silently showing wrong data.
 */
export type HeatmapQuality =
  | 'accurate'          // All steps mapped to depth-0, known file
  | 'partial'           // Some steps unmapped (cross-contract calls, assembly)
  | 'unavailable';      // Contract is a proxy / delegatecall pattern — heatmap meaningless

export interface TraceMapResult {
  lineGasMap: Map<number, number>;
  quality: HeatmapQuality;
  /**
   * Gas attributed to cross-contract / proxy calls that could not be
   * mapped back to a source line.
   */
  unmappedGas: number;
  /** Total gas in the trace structLogs. */
  totalTracedGas: number;
}

/**
 * Parses a standard Solidity source map string into an array of SourceLocations.
 * Format: s:l:f:j;s:l:f:j...
 * Missing parts inherit from the previous instruction.
 */
export function parseSourceMap(sourceMapStr: string): SourceLocation[] {
  if (!sourceMapStr) return [];

  const parts = sourceMapStr.split(';');
  const result: SourceLocation[] = [];

  let lastOffset = -1;
  let lastLength = -1;
  let lastFileIndex = -1;
  let lastJumpType = '';

  for (const part of parts) {
    const segments = part.split(':');

    if (segments.length > 0 && segments[0] !== '') lastOffset = parseInt(segments[0], 10);
    if (segments.length > 1 && segments[1] !== '') lastLength = parseInt(segments[1], 10);
    if (segments.length > 2 && segments[2] !== '') lastFileIndex = parseInt(segments[2], 10);
    if (segments.length > 3 && segments[3] !== '') lastJumpType = segments[3];

    result.push({
      offset: lastOffset,
      length: lastLength,
      fileIndex: lastFileIndex,
      jumpType: lastJumpType,
    });
  }

  return result;
}

/**
 * Maps byte offsets to line/column numbers in the source code.
 */
export function offsetToLineColumn(sourceCode: string, offset: number): LineMap {
  const normalizedSource = sourceCode.substring(0, offset).replace(/\r\n/g, '\n');
  const lines = normalizedSource.split('\n');
  return {
    line: lines.length, // 1-indexed
    column: lines[lines.length - 1].length + 1, // 1-indexed
  };
}

/**
 * Correlates EVM execution traces to source lines using accurate PC-to-Instruction mapping.
 *
 * Key correctness fixes vs. original:
 * 1. Depth filtering — only depth-1 steps belong to the compiled contract.
 *    Steps at depth > 1 are subcalls (external contracts, proxies). Including
 *    them attributes gas to the wrong source line.
 * 2. fileIndex === -1 means "compiler-generated, no source location" (e.g. ABI
 *    encoding glue, inline assembly). These are skipped rather than blamed on
 *    whatever the previous source map entry pointed to.
 * 3. Returns HeatmapQuality so the UI can warn when data is partial or meaningless.
 */
export function mapTraceToLines(
  trace: any,
  sourceMap: SourceLocation[],
  sourceCode: string,
  bytecode?: string,
  topLevelDepth: number = 0,
): TraceMapResult {
  const lineGasMap = new Map<number, number>();
  const empty: TraceMapResult = {
    lineGasMap,
    quality: 'unavailable',
    unmappedGas: 0,
    totalTracedGas: 0,
  };

  if (!trace || !trace.structLogs || !sourceMap || sourceMap.length === 0) {
    return empty;
  }

  // ── 1. Build PC → instruction-index map ──────────────────────────────────
  // Source maps index by instruction number, traces reference byte offset (PC).
  const pcToIndexMap = new Map<number, number>();

  if (bytecode) {
    const code = hexToBytes(bytecode.startsWith('0x') ? bytecode : '0x' + bytecode);
    let instructionIndex = 0;
    for (let pc = 0; pc < code.length; ) {
      pcToIndexMap.set(pc, instructionIndex);
      const opcode = code[pc];
      // PUSH1 (0x60) to PUSH32 (0x7f) consume 1+N bytes
      if (opcode >= 0x60 && opcode <= 0x7f) {
        pc += (opcode - 0x60) + 2;
      } else {
        pc++;
      }
      instructionIndex++;
    }
  } else {
    // Fallback: infer from trace PC sequence (only covers executed paths)
    let lastPc = -1;
    let instructionIndex = 0;
    trace.structLogs.forEach((log: any) => {
      if (log.pc !== lastPc) {
        pcToIndexMap.set(log.pc, instructionIndex++);
        lastPc = log.pc;
      }
    });
  }

  // ── 2. Detect proxy / delegatecall patterns ───────────────────────────────
  // If a significant share of the trace executes at depth > 1, the contract
  // is likely a proxy or uses delegatecall heavily.  The heatmap for the
  // outermost contract will be misleading in that case.
  const totalSteps: number = trace.structLogs.length;
  const depth1Steps: number = trace.structLogs.filter((l: any) => l.depth === topLevelDepth).length;
  const proxyRatio = totalSteps > 0 ? (totalSteps - depth1Steps) / totalSteps : 0;

  // ── 3. Map top-level steps to source lines ───────────────────────────────
  let unmappedGas = 0;
  let totalTracedGas = 0;

  trace.structLogs.forEach((log: any) => {
    const stepGas: number = log.gasCost ?? 0;
    totalTracedGas += stepGas;

    if (log.depth !== topLevelDepth) {
      unmappedGas += stepGas;
      return;
    }

    const instIndex = pcToIndexMap.get(log.pc);
    if (instIndex === undefined) {
      unmappedGas += stepGas;
      return;
    }

    const mappedLoc = sourceMap[instIndex];

    // fileIndex === -1 means compiler-generated code (ABI codec, assembly).
    // Attributing this gas to the previous source line would be wrong.
    if (!mappedLoc || mappedLoc.offset === -1 || mappedLoc.fileIndex === -1) {
      unmappedGas += stepGas;
      return;
    }

    const lineMap = offsetToLineColumn(sourceCode, mappedLoc.offset);
    const currentGas = lineGasMap.get(lineMap.line) ?? 0;
    lineGasMap.set(lineMap.line, currentGas + stepGas);
  });

  // ── 4. Determine quality rating ───────────────────────────────────────────
  let quality: HeatmapQuality;
  if (proxyRatio > 0.5) {
    // More than half the execution happened in subcalls — don't trust the map
    quality = 'unavailable';
  } else if (unmappedGas / Math.max(totalTracedGas, 1) > 0.25) {
    quality = 'partial';
  } else {
    quality = 'accurate';
  }

  return { lineGasMap, quality, unmappedGas, totalTracedGas };
}

/**
 * Helper to convert hex to bytes (kept local to avoid circular imports)
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array((hex.length - 2) / 2);
  for (let i = 2, j = 0; i < hex.length; i += 2, j++) {
    bytes[j] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
