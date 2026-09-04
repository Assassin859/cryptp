import { AbiCoder } from 'ethers';
import { asAbiArray } from '../types/abi';

export interface ConstructorInput {
  name?: string;
  type: string;
}

/** Stable form key for ctor inputs (handles unnamed args). */
export function constructorArgKey(input: ConstructorInput, index: number): string {
  return input.name && input.name.length > 0 ? input.name : `arg_${index}`;
}

/** Parse constructor argument strings into typed values for deploy. Throws on invalid input. */
export function parseConstructorArgs(
  constructorInputs: ConstructorInput[],
  rawArgs: Record<string, string>
): unknown[] {
  return constructorInputs.map((input, index) => {
    const key = constructorArgKey(input, index);
    const val = (rawArgs[key] ?? rawArgs[input.name || ''] ?? '').trim();

    if (!val) {
      if (input.type.includes('uint') || input.type.includes('int')) {
        throw new Error(`Missing constructor argument: ${key} (${input.type})`);
      }
      if (input.type === 'bool') return false;
      if (input.type === 'address') {
        throw new Error(`Missing constructor argument: ${key} (address)`);
      }
      return '';
    }

    if (input.type.includes('uint') || input.type.includes('int')) {
      try {
        return BigInt(val);
      } catch {
        throw new Error(`Invalid integer for ${key}: "${val}"`);
      }
    }
    if (input.type === 'bool') {
      const lower = val.toLowerCase();
      if (lower !== 'true' && lower !== 'false') {
        throw new Error(`Invalid bool for ${key}: "${val}"`);
      }
      return lower === 'true';
    }
    if (
      input.type.includes('[]') ||
      input.type.startsWith('bytes') ||
      input.type.includes('tuple')
    ) {
      try {
        return JSON.parse(val);
      } catch {
        throw new Error(`Invalid JSON for ${key}: "${val}"`);
      }
    }
    return val;
  });
}

/** Encode constructor args as hex suffix (no 0x prefix) for appending to creation bytecode. */
export function encodeConstructorSuffix(args: unknown[], abi?: unknown[]): string {
  if (args.length === 0) return '';
  if (!abi) {
    throw new Error('Cannot encode constructor args without ABI type information');
  }
  const abiList = asAbiArray(abi);
  const ctor = abiList.find(
    (item) => item && (item as { type?: string }).type === 'constructor'
  ) as { inputs?: ConstructorInput[] } | undefined;
  const inputs = ctor?.inputs ?? [];
  if (inputs.length === 0) {
    throw new Error('ABI has no constructor inputs but args were provided');
  }
  if (inputs.length !== args.length) {
    throw new Error(
      `Constructor arg count mismatch: ABI expects ${inputs.length}, got ${args.length}`
    );
  }
  const types = inputs.map((i) => i.type);
  const coder = AbiCoder.defaultAbiCoder();
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

/** True when the ABI constructor has one or more inputs. */
export function abiHasConstructorArgs(abi: unknown[] | undefined): boolean {
  if (!abi) return false;
  const abiList = asAbiArray(abi);
  const ctor = abiList.find((item) => item && (item as { type?: string }).type === 'constructor') as
    | { inputs?: ConstructorInput[] }
    | undefined;
  return (ctor?.inputs?.length ?? 0) > 0;
}
