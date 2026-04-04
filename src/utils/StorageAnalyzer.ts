import * as parser from '@solidity-parser/parser';

export interface StorageVariable {
  name: string;
  type: string;
  byteSize: number;
  slot: number;
  offset: number;
}

export interface StorageLayout {
  variables: StorageVariable[];
  totalSlots: number;
  unpackedSlots: number[]; // Slots that could potentially be packed more efficiently
}

/**
 * Estimates the byte size of standard Solidity types.
 */
function getTypeByteSize(typeString: string): number {
  if (typeString.startsWith('uint') || typeString.startsWith('int')) {
    const bits = typeString.replace('uint', '').replace('int', '') || '256';
    return parseInt(bits, 10) / 8;
  }
  if (typeString === 'address') return 20;
  if (typeString === 'bool') return 1;
  if (typeString.startsWith('bytes')) {
    if (typeString === 'bytes') return 32; // dynamic array pointer
    const bytes = typeString.replace('bytes', '');
    return parseInt(bytes, 10);
  }
  return 32; // Default to full slot (32 bytes) for strings, arrays, structs, mapping pointers
}

/**
 * Simulates Solidity's storage packing rules.
 */
export function analyzeStorageLayout(sourceCode: string): StorageLayout {
  const variables: StorageVariable[] = [];
  let currentSlot = 0;
  let currentOffset = 0;
  
  try {
    const ast = parser.parse(sourceCode, { loc: true });
    
    parser.visit(ast, {
      StateVariableDeclaration: (node) => {
        node.variables.forEach(v => {
          const typeName = (v.typeName as any)?.name || 'uint256';
          const size = getTypeByteSize(typeName);
          
          if (currentOffset + size > 32) {
            // Cannot fit in current slot, move to next
            currentSlot++;
            currentOffset = 0;
          }
          
          variables.push({
            name: v.name || 'unnamed',
            type: typeName,
            byteSize: size,
            slot: currentSlot,
            offset: currentOffset
          });
          
          currentOffset += size;
        });
      }
    });

    if (currentOffset > 0) {
      currentSlot++; // Account for the last partially filled slot
    }
  } catch (e) {
    console.warn("Storage analyzer failed to parse AST", e);
  }

  // Identify unpacked slots (slots with < 32 bytes that are not the last slot, although packing is complex)
  const unpackedSlots = new Set<number>();
  const slotOccupancy = new Map<number, number>();
  
  variables.forEach(v => {
    slotOccupancy.set(v.slot, (slotOccupancy.get(v.slot) || 0) + v.byteSize);
  });

  slotOccupancy.forEach((bytes, slot) => {
    // If a slot has fewer than 32 bytes and there's a subsequent slot containing a variable that could fit
    if (bytes < 32 && slot < currentSlot - 1) {
       unpackedSlots.add(slot);
    }
  });

  return {
    variables,
    totalSlots: currentSlot,
    unpackedSlots: Array.from(unpackedSlots)
  };
}
