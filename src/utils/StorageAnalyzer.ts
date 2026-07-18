import * as parser from '@solidity-parser/parser';

// ─── Public Types ─────────────────────────────────────────────────────────────

export type StorageCategory = 'value' | 'mapping' | 'array' | 'struct' | 'string';

export interface StorageVariable {
  name: string;
  type: string;
  byteSize: number;
  slot: number;
  offset: number;
  /** Broad category for color-coding in the UI */
  category: StorageCategory;
  /** How many bytes this variable occupies in its slot (same as byteSize for values, 32 for ref types) */
  slotFill: number;
  /** Names of other variables packed into the same slot */
  isPackedWith: string[];
}

export interface StorageLayout {
  variables: StorageVariable[];
  totalSlots: number;
  /** Slots that have unused bytes and whose next slot also has a packable variable */
  unpackedSlots: number[];
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/** Map of struct name → ordered list of { name, typeName } for its fields */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StructDefs = Map<string, Array<{ name: string; typeName: any }>>;

/**
 * Walk a Solidity `TypeName` AST node and return { byteSize, category, label }.
 *
 * Solidity packing rules:
 *  - Value types (uintN, intN, bool, address, bytesN): packed tightly, N bytes
 *  - bytes / string / T[] / mapping: reference type, always occupies exactly one
 *    32-byte slot (the slot stores a pointer / keccak seed)
 *  - T[N] fixed arrays: N × sizeof(T) — if this exceeds 32, it rounds up to the
 *    nearest multiple of 32 (each element aligned to its own slot if > 16 bytes)
 *  - struct: expand all members with recursive packing; size = total packed slots × 32
 */
function resolveType(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeNode: any,
  structDefs: StructDefs
): { byteSize: number; category: StorageCategory; label: string } {
  if (!typeNode) return { byteSize: 32, category: 'value', label: 'unknown' };

  const kind = typeNode.type as string;

  // ── ElementaryTypeName ────────────────────────────────────────────────────
  if (kind === 'ElementaryTypeName') {
    const name: string = typeNode.name || '';

    if (name === 'bool') return { byteSize: 1, category: 'value', label: 'bool' };
    if (name === 'address') return { byteSize: 20, category: 'value', label: 'address' };

    if (name.startsWith('uint') || name.startsWith('int')) {
      const bitsStr = name.replace(/^u?int/, '');
      const bits = bitsStr === '' ? 256 : parseInt(bitsStr, 10);
      return { byteSize: bits / 8, category: 'value', label: name };
    }

    if (name.startsWith('bytes')) {
      const suffix = name.slice('bytes'.length);
      if (suffix === '') {
        // dynamic `bytes` — reference type, 32-byte pointer
        return { byteSize: 32, category: 'string', label: 'bytes' };
      }
      const n = parseInt(suffix, 10);
      if (!isNaN(n) && n >= 1 && n <= 32) {
        return { byteSize: n, category: 'value', label: name };
      }
    }

    if (name === 'string') return { byteSize: 32, category: 'string', label: 'string' };

    // Fallback for exotic elementary types
    return { byteSize: 32, category: 'value', label: name };
  }

  // ── Mapping ───────────────────────────────────────────────────────────────
  if (kind === 'Mapping') {
    const keyLabel = resolveType(typeNode.keyType, structDefs).label;
    const valLabel = resolveType(typeNode.valueType, structDefs).label;
    return {
      byteSize: 32,
      category: 'mapping',
      label: `mapping(${keyLabel} => ${valLabel})`,
    };
  }

  // ── ArrayTypeName ─────────────────────────────────────────────────────────
  if (kind === 'ArrayTypeName') {
    const baseType = resolveType(typeNode.baseTypeName, structDefs);

    if (typeNode.length == null) {
      // dynamic array T[] — reference type
      return {
        byteSize: 32,
        category: 'array',
        label: `${baseType.label}[]`,
      };
    }

    // Fixed array T[N]
    const n = Number(
      typeNode.length?.number ?? typeNode.length?.value ?? typeNode.length ?? 0
    );
    if (n === 0 || isNaN(n)) {
      return { byteSize: 32, category: 'array', label: `${baseType.label}[?]` };
    }

    // Solidity packs elements smaller than 16 bytes into slots; larger ones
    // each get their own slot(s). We approximate: total bytes, rounded up to 32.
    const rawBytes = baseType.byteSize * n;
    const slots = Math.ceil(rawBytes / 32);
    return {
      byteSize: slots * 32,
      category: 'array',
      label: `${baseType.label}[${n}]`,
    };
  }

  // ── UserDefinedTypeName (struct / enum / contract) ────────────────────────
  if (kind === 'UserDefinedTypeName') {
    const name: string =
      typeNode.namePath || typeNode.name || (typeNode.namePath as string) || 'unknown';

    // Enum: 1 byte (fits in a uint8 effectively)
    // We can't distinguish enum from struct/contract at this level without
    // the full symbol table, but enums are always 1 byte.
    // We handle it: if no struct def found, assume 32-byte opaque type.
    if (structDefs.has(name)) {
      const members = structDefs.get(name)!;
      // Simulate packing the struct's members
      const { slots } = packMembers(members, structDefs);
      return {
        byteSize: slots * 32,
        category: 'struct',
        label: name,
      };
    }

    // Unknown user-defined type (contract ref, interface, library, enum)
    return { byteSize: 32, category: 'value', label: name };
  }

  // Fallback
  return { byteSize: 32, category: 'value', label: 'unknown' };
}

/**
 * Simulate Solidity slot packing for a list of typed members.
 * Returns { slots: number, variables: partial StorageVariable[] }
 */
function packMembers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: Array<{ name: string; typeName: any }>,
  structDefs: StructDefs
): { slots: number; vars: Array<{ name: string; type: string; byteSize: number; slot: number; offset: number; category: StorageCategory }> } {
  let currentSlot = 0;
  let currentOffset = 0;
  const vars: Array<{ name: string; type: string; byteSize: number; slot: number; offset: number; category: StorageCategory }> = [];

  for (const member of members) {
    const { byteSize, category, label } = resolveType(member.typeName, structDefs);

    // Reference types and types ≥ 32 bytes must start on a fresh slot boundary
    const mustAlign = byteSize >= 32 || category === 'mapping' || category === 'array' || category === 'string';

    if (mustAlign && currentOffset > 0) {
      currentSlot++;
      currentOffset = 0;
    } else if (!mustAlign && currentOffset + byteSize > 32) {
      currentSlot++;
      currentOffset = 0;
    }

    vars.push({
      name: member.name || '(unnamed)',
      type: label,
      byteSize,
      slot: currentSlot,
      offset: currentOffset,
      category,
    });

    if (mustAlign) {
      const slotsConsumed = Math.ceil(byteSize / 32);
      currentSlot += slotsConsumed;
      currentOffset = 0;
    } else {
      currentOffset += byteSize;
      if (currentOffset >= 32) {
        currentSlot++;
        currentOffset = 0;
      }
    }
  }

  const totalSlots = currentOffset > 0 ? currentSlot + 1 : currentSlot;
  return { slots: totalSlots, vars };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse Solidity source and produce a full storage layout with correct slot
 * assignments, type categories, and packing metadata.
 */
export function analyzeStorageLayout(sourceCode: string): StorageLayout {
  const variables: StorageVariable[] = [];

  try {
    const ast = parser.parse(sourceCode, { loc: true, tolerant: true });

    // First pass: collect all struct definitions
    const structDefs: StructDefs = new Map();
    parser.visit(ast, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      StructDefinition: (node: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const members = (node.members || []).map((m: any) => ({
          name: m.name || '',
          typeName: m.typeName,
        }));
        structDefs.set(node.name, members);
      },
    });

    // Second pass: process state variables for each contract in the file
    parser.visit(ast, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ContractDefinition: (contractNode: any) => {
        // Only process contract bodies (not interfaces / libraries for now)
        if (contractNode.kind === 'interface') return;

        // Collect state variable declarations in order
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stateVarNodes: Array<{ name: string; typeName: any }> = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (contractNode.subNodes || []).forEach((node: any) => {
          if (node.type === 'StateVariableDeclaration') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (node.variables || []).forEach((v: any) => {
              // Skip constants and immutables — they have no storage slot
              if (v.isDeclaredConst || v.isImmutable) return;
              stateVarNodes.push({ name: v.name || 'unnamed', typeName: v.typeName });
            });
          }
        });

        if (stateVarNodes.length === 0) return;

        // Pack state variables
        const { vars } = packMembers(stateVarNodes, structDefs);

        // Build enriched output
        vars.forEach(v => {
          variables.push({
            name: v.name,
            type: v.type,
            byteSize: v.byteSize,
            slot: v.slot,
            offset: v.offset,
            category: v.category,
            slotFill: Math.min(v.byteSize, 32),
            isPackedWith: [], // filled in below
          });
        });
      },
    });

    // Annotate isPackedWith
    const bySlot = new Map<number, StorageVariable[]>();
    variables.forEach(v => {
      if (!bySlot.has(v.slot)) bySlot.set(v.slot, []);
      bySlot.get(v.slot)!.push(v);
    });
    bySlot.forEach(slotVars => {
      if (slotVars.length > 1) {
        slotVars.forEach(v => {
          v.isPackedWith = slotVars.filter(other => other !== v).map(o => o.name);
        });
      }
    });
  } catch (e) {
    console.warn('Storage analyzer parse failed:', e);
  }

  // Compute totalSlots
  const maxSlot = variables.reduce((max, v) => Math.max(max, v.slot), -1);
  const totalSlots = maxSlot + 1;

  // Identify unpacked slots: slots whose occupancy < 32 bytes followed by a
  // variable in the next slot that could theoretically fit
  const slotOccupancy = new Map<number, number>();
  variables.forEach(v => {
    slotOccupancy.set(v.slot, (slotOccupancy.get(v.slot) || 0) + Math.min(v.byteSize, 32));
  });

  const unpackedSlots: number[] = [];
  slotOccupancy.forEach((bytes, slot) => {
    if (bytes < 32 && slot < totalSlots - 1) {
      unpackedSlots.push(slot);
    }
  });

  return { variables, totalSlots, unpackedSlots };
}
