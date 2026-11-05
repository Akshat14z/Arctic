import { randomBytes } from 'crypto';
import type {
  Case,
  CaseReason,
  CaseStatus,
  CaseSummary,
  CreateCaseRequest,
  CaseDetailResponse,
  AgentQueueResponse,
  LangCode,
  Deal,
  ShownToDetail,
  User as ContractUser,
} from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors.js';
import { getConfig } from '../config.js';
import { createEscalationGroupChannel, addMemberToGroupChannel } from '../nexconn/channels.js';

type UserRecord = {
  id: string;
  displayName: string;
  language: string;
  role: string;
  isDemo: boolean;
  agentLanguages: string[];
};

type CaseRecordWithRelations = {
  id: string;
  channelId: string;
  groupChannelId: string;
  buyerId: string;
  sellerId: string;
  agentId: string | null;
  reason: string;
  status: string;
  dealSnapshot: unknown;
  resolution: string | null;
  slaDueAt: Date;
  createdAt: Date;
  claimedAt: Date | null;
  resolvedAt: Date | null;
  buyer: UserRecord;
  seller: UserRecord;
  agent: UserRecord | null;
};

function formatUser(u: UserRecord): ContractUser {
  return {
    id: u.id,
    displayName: u.displayName,
    language: u.language as LangCode,
    role: u.role as 'user' | 'agent',
    isDemo: u.isDemo,
    agentLanguages: u.agentLanguages.length > 0 ? (u.agentLanguages as LangCode[]) : undefined,
  };
}

export function formatCase(c: CaseRecordWithRelations): Case {
  const langs = Array.from(
    new Set([
      c.buyer.language,
      c.seller.language,
      ...(c.agent ? [c.agent.language] : []),
    ])
  ) as LangCode[];

  return {
    id: c.id,
    channelId: c.channelId,
    groupChannelId: c.groupChannelId,
    buyer: formatUser(c.buyer),
    seller: formatUser(c.seller),
    agent: c.agent ? formatUser(c.agent) : undefined,
    reason: c.reason as CaseReason,
    status: c.status as CaseStatus,
    languages: langs,
    createdAt: c.createdAt.toISOString(),
    claimedAt: c.claimedAt?.toISOString(),
    resolvedAt: c.resolvedAt?.toISOString(),
    slaDueAt: c.slaDueAt.toISOString(),
    dealSnapshot: (c.dealSnapshot as Deal) ?? undefined,
    resolution: c.resolution ?? undefined,
  };
}

/**
 * Creates or retrieves an active support dispute case for a chat conversation.
 * Idempotent per chat: if an open or claimed case exists, returns that case.
 */
export async function createOrGetCase(
  userId: string,
  input: CreateCaseRequest
): Promise<Case> {
  const chat = await prisma.chat.findUnique({
    where: { channelId: input.channelId },
    include: {
      buyer: true,
      seller: true,
    },
  });

  if (!chat) {
    throw new AppError('CHAT_NOT_FOUND', `Chat conversation '${input.channelId}' not found`, 404, false);
  }

  // Authorization: Only participants in the conversation can request help
  if (chat.buyerId !== userId && chat.sellerId !== userId) {
    throw new AppError('FORBIDDEN', 'You must be a participant in this conversation to request help', 403, false);
  }

  // Idempotency check: Return existing active case if already created (DHRUMIL-010 #1)
  const existingActiveCase = await prisma.case.findFirst({
    where: {
      channelId: input.channelId,
      status: { in: ['open', 'claimed'] },
    },
    include: {
      buyer: true,
      seller: true,
      agent: true,
    },
  });

  if (existingActiveCase) {
    return formatCase(existingActiveCase);
  }

  // Freeze latest agreed deal snapshot if present (D-018)
  const latestAgreedDeal = await prisma.deal.findFirst({
    where: {
      channelId: input.channelId,
      status: 'agreed',
    },
    orderBy: { createdAt: 'desc' },
  });

  const caseId = `c_${randomBytes(6).toString('hex')}`;
  const groupChannelId = `grp_${caseId}`;
  const slaDueAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute SLA

  // Create Nexconn 3-way Group Channel server-side
  const config = getConfig();
  if (config.NEXCONN_APP_KEY && config.NEXCONN_APP_SECRET) {
    try {
      await createEscalationGroupChannel({
        channelId: groupChannelId,
        name: `Dispute Case ${caseId}`,
        owner: userId,
        userIds: [chat.buyerId, chat.sellerId],
      });
    } catch (err) {
      console.warn(`[Nexconn] Group channel creation failed for case ${caseId}:`, err);
      if (config.NODE_ENV === 'production') {
        throw new AppError('NEXCONN_GROUP_CREATE_FAILED', 'Failed to initialize real-time dispute channel', 502, true);
      }
    }
  }

  const createdCase = await prisma.case.create({
    data: {
      id: caseId,
      channelId: input.channelId,
      groupChannelId,
      buyerId: chat.buyerId,
      sellerId: chat.sellerId,
      reason: input.reason,
      status: 'open',
      dealSnapshot: latestAgreedDeal ? (latestAgreedDeal.payload as any) : undefined,
      slaDueAt,
    },
    include: {
      buyer: true,
      seller: true,
      agent: true,
    },
  });

  return formatCase(createdCase);
}

/**
 * Returns the agent dispatch queue of non-resolved support cases.
 * Ordered by open cases first, then prioritized by SLA due time ascending.
 */
export async function getAgentQueue(agentUser: ContractUser): Promise<AgentQueueResponse> {
  if (agentUser.role !== 'agent') {
    throw new AppError('FORBIDDEN', 'Only support agents can access the dispatch queue', 403, false);
  }

  const cases = await prisma.case.findMany({
    where: {
      status: { in: ['open', 'claimed'] },
    },
    include: {
      buyer: true,
      seller: true,
      agent: true,
    },
  });

  // Routing v0 (ARCHITECTURE §4.4):
  // 1. Open cases come before claimed cases
  // 2. Cases matching agent's supported languages get priority
  // 3. Closest SLA due date ascending
  const agentLangs = new Set(agentUser.agentLanguages ?? [agentUser.language]);

  const sorted = [...cases].sort((a, b) => {
    // Priority 1: Open cases first
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (a.status !== 'open' && b.status === 'open') return 1;

    // Priority 2: Language match priority
    const aMatch = agentLangs.has(a.buyer.language as LangCode) && agentLangs.has(a.seller.language as LangCode);
    const bMatch = agentLangs.has(b.buyer.language as LangCode) && agentLangs.has(b.seller.language as LangCode);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;

    // Priority 3: SLA due date ascending
    return a.slaDueAt.getTime() - b.slaDueAt.getTime();
  });

  return {
    items: sorted.map(formatCase),
  };
}

/**
 * Claims an open support case atomically for the authenticated agent.
 */
export async function claimCase(caseId: string, agentUser: ContractUser): Promise<Case> {
  if (agentUser.role !== 'agent') {
    throw new AppError('FORBIDDEN', 'Only support agents can claim cases', 403, false);
  }

  const existingCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      buyer: true,
      seller: true,
      agent: true,
    },
  });

  if (!existingCase) {
    throw new AppError('CASE_NOT_FOUND', `Case '${caseId}' not found`, 404, false);
  }

  if (existingCase.status === 'resolved') {
    throw new AppError('CASE_ALREADY_RESOLVED', 'Cannot claim an already resolved case', 400, false);
  }

  // Idempotency: Same agent re-claiming returns existing case (DHRUMIL-011 #2)
  if (existingCase.agentId === agentUser.id) {
    return formatCase(existingCase);
  }

  // Already claimed by another agent -> 409 Conflict
  if (existingCase.status === 'claimed' && existingCase.agentId !== agentUser.id) {
    throw new AppError('CASE_ALREADY_CLAIMED', 'Another agent has already claimed this case', 409, false);
  }

  // Atomic claim
  const updatedCase = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: 'claimed',
      agentId: agentUser.id,
      claimedAt: new Date(),
    },
    include: {
      buyer: true,
      seller: true,
      agent: true,
    },
  });

  // Add agent to Nexconn group channel
  const config = getConfig();
  if (config.NEXCONN_APP_KEY && config.NEXCONN_APP_SECRET) {
    try {
      await addMemberToGroupChannel(existingCase.groupChannelId, agentUser.id);
    } catch (err) {
      console.warn(`[Nexconn] Failed to add agent ${agentUser.id} to group ${existingCase.groupChannelId}:`, err);
    }
  }

  return formatCase(updatedCase);
}

/**
 * Resolves an active dispute case. Only the claiming agent is permitted.
 */
export async function resolveCase(
  caseId: string,
  agentUser: ContractUser,
  resolution: string
): Promise<Case> {
  if (agentUser.role !== 'agent') {
    throw new AppError('FORBIDDEN', 'Only support agents can resolve cases', 403, false);
  }

  const existingCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      buyer: true,
      seller: true,
      agent: true,
    },
  });

  if (!existingCase) {
    throw new AppError('CASE_NOT_FOUND', `Case '${caseId}' not found`, 404, false);
  }

  if (existingCase.status === 'resolved') {
    throw new AppError('CASE_ALREADY_RESOLVED', 'This case is already resolved', 400, false);
  }

  // Only the claiming agent can resolve
  if (existingCase.agentId !== agentUser.id) {
    throw new AppError('FORBIDDEN', 'Only the claiming agent can resolve this case', 403, false);
  }

  const resolved = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: 'resolved',
      resolution,
      resolvedAt: new Date(),
    },
    include: {
      buyer: true,
      seller: true,
      agent: true,
    },
  });

  return formatCase(resolved);
}

/**
 * Retrieves full case detail including transcript lines and summary.
 * Permitted for the case buyer, seller, and any support agent.
 */
export async function getCaseDetail(
  caseId: string,
  currentUser: ContractUser
): Promise<CaseDetailResponse> {
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      buyer: true,
      seller: true,
      agent: true,
    },
  });

  if (!c) {
    throw new AppError('CASE_NOT_FOUND', `Case '${caseId}' not found`, 404, false);
  }

  const isBuyer = c.buyerId === currentUser.id;
  const isSeller = c.sellerId === currentUser.id;
  const isAgent = currentUser.role === 'agent';

  if (!isBuyer && !isSeller && !isAgent) {
    throw new AppError('FORBIDDEN', 'You are not authorized to access this case', 403, false);
  }

  // Retrieve transcript lines for the direct chat and the 3-way group
  const lines = await prisma.transcriptLine.findMany({
    where: {
      channelId: { in: [c.channelId, c.groupChannelId] },
    },
    orderBy: { at: 'asc' },
  });

  const formattedTranscript = lines.map((l) => ({
    at: l.at.toISOString(),
    from: l.fromId,
    orig: {
      lang: l.origLang as LangCode,
      text: l.origText,
    },
    tr: (l.tr as Record<LangCode, string>) ?? {},
    shownTo: (l.shownTo as Record<string, ShownToDetail>) ?? {},
  }));

  const reasonLabel = c.reason.replace(/_/g, ' ');
  const summary: CaseSummary = {
    lang: currentUser.language as LangCode,
    text: `Dispute regarding ${reasonLabel}. Buyer: ${c.buyer.displayName}, Seller: ${c.seller.displayName}.${c.resolution ? ` Resolution: ${c.resolution}` : ''}`,
    keyFacts: [
      `Reason: ${reasonLabel}`,
      `Status: ${c.status}`,
      `Channel: ${c.channelId}`,
      ...(c.resolution ? [`Resolution: ${c.resolution}`] : []),
    ],
    deal: (c.dealSnapshot as Deal) ?? undefined,
  };

  return {
    case: formatCase(c),
    transcript: formattedTranscript,
    summary,
  };
}
