import { AbiCoder } from 'ethers';
import { asAbiArray } from '../types/abi';

export interface ConstructorInput {
  name?: string;
  type: string;
}

/** Parse constructor argument strings into typed values for deploy. */
export function parseConstructorArgs(
  constructorInputs: ConstructorInput[],
  rawArgs: Record<string, string>
): unknown[] {
  return constructorInputs.map((input) => {
    const val = rawArgs[input.name || ''] || '';
    if (!val) {
      if (input.type.includes('uint') || input.type.includes('int')) return 0n;
      if (input.type === 'bool') return false;
      return '';
    }
    if (input.type.includes('uint') || input.type.includes('int')) {
      try {
        return BigInt(val);
      } catch {
        return 0n;
      }
    }
    if (input.type === 'bool') {
      return val.toLowerCase() === 'true';
    }
    if (
      input.type.includes('[]') ||
      input.type.startsWith('bytes') ||
      input.type.includes('tuple')
    ) {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  });
}

/** Encode constructor args as hex suffix (no 0x prefix) for appending to creation bytecode. */
export function encodeConstructorSuffix(args: unknown[], abi?: unknown[]): string {
  if (args.length === 0) return '';
  if (abi) {
    const abiList = asAbiArray(abi);
    const ctor = abiList.find(
      (item) => item && (item as { type?: string }).type === 'constructor'
    ) as { inputs?: ConstructorInput[] } | undefined;
    const inputs = ctor?.inputs ?? [];
    if (inputs.length > 0) {
      const types = inputs.map((i) => i.type);
      const coder = AbiCoder.defaultAbiCoder();
      const encoded = coder.encode(types, args);
      return encoded.startsWith('0x') ? encoded.slice(2) : encoded;
    }
  }
  const coder = AbiCoder.defaultAbiCoder();
  const types = args.map(() => 'uint256');
  const encoded = coder.encode(types, args);
  return encoded.startsWith('0x') ? encoded.slice(2) : encoded;
}

export function parseConstructorArgsFromAbi(
  abi: unknown[],
  rawArgs: Record<string, string>
): unknown[] {
  const abiList = asAbiArray(abi);
  const ctor = abiList.find((item) => item && (item as { type?: string }).type === 'constructor') as
    | { inputs?: ConstructorInput[] }
    | undefined;
  const inputs = ctor?.inputs ?? [];
  return parseConstructorArgs(inputs, rawArgs);
}
