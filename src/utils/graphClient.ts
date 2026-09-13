import {
  getGraphEndpoint,
  getGraphRegistryAddress,
} from './graphConstants';

export interface ValueChangedRow {
  id: string;
  contract: string;
  setter: string;
  newValue: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface IndexedContractRow {
  id: string;
  contractAddress: string;
  registrant: string;
  kind: string;
  registeredAt: string;
  blockNumber: string;
}

/** Indexed AuditFirewallConsumer VerdictReceived (1=ALLOW, 2=DENY, 3=MANUAL_REVIEW). */
export interface VerdictReceivedRow {
  id: string;
  contract: string;
  verdictCode: number;
  riskMask: number;
  sourceHash: string;
  reporter: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export class GraphClientError extends Error {
  constructor(
    message: string,
    public readonly code: 'missing_endpoint' | 'http' | 'graphql' | 'network'
  ) {
    super(message);
    this.name = 'GraphClientError';
  }
}

async function querySubgraph<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const endpoint = getGraphEndpoint();
  if (!endpoint) {
    throw new GraphClientError(
      'The Graph endpoint is not configured. Use Aethon platform env or Indexed → My Graph Studio.',
      'missing_endpoint'
    );
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    throw new GraphClientError(
      e instanceof Error ? e.message : 'Network error talking to The Graph',
      'network'
    );
  }

  if (!res.ok) {
    throw new GraphClientError(
      `Graph HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
      'http'
    );
  }

  const body = (await res.json()) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (body.errors?.length) {
    throw new GraphClientError(body.errors.map((x) => x.message).join('; '), 'graphql');
  }

  if (!body.data) {
    throw new GraphClientError('Empty GraphQL response', 'graphql');
  }

  return body.data;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/** Bytes ids in The Graph are often lowercase hex without checksum. */
export async function fetchIndexedContract(
  contractAddress: string
): Promise<IndexedContractRow | null> {
  const id = normalizeAddress(contractAddress);
  const data = await querySubgraph<{ indexedContract: IndexedContractRow | null }>(
    `query ($id: ID!) {
      indexedContract(id: $id) {
        id
        contractAddress
        registrant
        kind
        registeredAt
        blockNumber
      }
    }`,
    { id }
  );
  return data.indexedContract;
}

export async function fetchValueChangedForContract(
  contractAddress: string,
  first = 50
): Promise<ValueChangedRow[]> {
  const contract = normalizeAddress(contractAddress);
  const data = await querySubgraph<{ valueChangeds: ValueChangedRow[] }>(
    `query ($contract: Bytes!, $first: Int!) {
      valueChangeds(
        first: $first
        orderBy: blockTimestamp
        orderDirection: desc
        where: { contract: $contract }
      ) {
        id
        contract
        setter
        newValue
        blockNumber
        blockTimestamp
        transactionHash
      }
    }`,
    { contract, first }
  );
  return data.valueChangeds ?? [];
}

export async function fetchVerdictReceivedForContract(
  contractAddress: string,
  first = 20
): Promise<VerdictReceivedRow[]> {
  const contract = normalizeAddress(contractAddress);
  const data = await querySubgraph<{ verdictReceiveds: VerdictReceivedRow[] }>(
    `query ($contract: Bytes!, $first: Int!) {
      verdictReceiveds(
        first: $first
        orderBy: blockTimestamp
        orderDirection: desc
        where: { contract: $contract }
      ) {
        id
        contract
        verdictCode
        riskMask
        sourceHash
        reporter
        blockNumber
        blockTimestamp
        transactionHash
      }
    }`,
    { contract, first }
  );
  return data.verdictReceiveds ?? [];
}

export function isGraphConfigured(): boolean {
  return Boolean(getGraphEndpoint());
}

/** Register requires a registry address (platform or custom Studio). */
export function isGraphRegisterConfigured(): boolean {
  return Boolean(getGraphEndpoint() && getGraphRegistryAddress());
}

/**
 * Poll until IndexedContract appears (Continuity verify wait).
 * Returns the row or null on timeout.
 */
export async function waitForIndexedContract(
  contractAddress: string,
  opts?: { timeoutMs?: number; intervalMs?: number; signal?: AbortSignal }
): Promise<IndexedContractRow | null> {
  const timeoutMs = opts?.timeoutMs ?? 90_000;
  const intervalMs = opts?.intervalMs ?? 4_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (opts?.signal?.aborted) return null;
    try {
      const row = await fetchIndexedContract(contractAddress);
      if (row) return row;
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  try {
    return await fetchIndexedContract(contractAddress);
  } catch {
    return null;
  }
}
