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
  const lines = sourceCode.substring(0, offset).split('\n');
  return {
    line: lines.length, // 1-indexed
    column: lines[lines.length - 1].length + 1, // 1-indexed
  };
}

/**
 * Correlates EVM execution traces to source lines.
 */
export function mapTraceToLines(trace: any, sourceMap: SourceLocation[], sourceCode: string): Map<number, number> {
  const lineGasMap = new Map<number, number>();

  if (!trace || !trace.structLogs || !sourceMap || sourceMap.length === 0) {
    return lineGasMap;
  }

  // Very simplified mapping: 
  // In reality, PC (Program Counter) -> Instruction Index -> SourceMap Index.
  // For a naive mapping, we assume each structLog corresponds roughly to instructions if decompiled.
  // A robust PC mapper requires parsing the exact deployed bytecode to build a PC -> instruction index array.
  
  // Here we will use a pseudo-mapping for demonstration of the visual analytics.
  // Proper PC mapping requires deeply analyzing the opcodes and PUSH lengths.
  
  // Mock fallback logic to demonstrate the GasProfiler UI
  trace.structLogs.forEach((log: any, index: number) => {
    // Determine instruction index (mocking 1 opcode ~ 1 byte, highly inaccurate but sufficient for visual demonstration without full EVM disassembler)
    const mockInstructionIndex = Math.min(index, sourceMap.length - 1);
    const mappedLoc = sourceMap[mockInstructionIndex];
    
    if (mappedLoc && mappedLoc.offset !== -1) {
      const lineMap = offsetToLineColumn(sourceCode, mappedLoc.offset);
      const currentGas = lineGasMap.get(lineMap.line) || 0;
      lineGasMap.set(lineMap.line, currentGas + log.gasCost);
    }
  });

  return lineGasMap;
}
