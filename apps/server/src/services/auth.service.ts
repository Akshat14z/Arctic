import { randomBytes, createHash } from 'crypto';
import type {
  GuestAuthRequest,
  AgentAuthRequest,
  AuthResponse,
  MeResponse,
  UpdateMeRequest,
  User,
  LangCode,
} from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { getConfig } from '../config.js';
import { issueNexconnToken } from '../nexconn/tokens.js';
import { AppError } from '../errors.js';

export function generateUserId(prefix = 'u'): string {
  const randomPart = randomBytes(6).toString('hex');
  return `${prefix}_${randomPart}`;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

interface DbUserLike {
  id: string;
  displayName: string;
  language: string;
  role: string;
  isDemo: boolean;
  agentLanguages: string[];
}

export function formatUser(dbUser: DbUserLike): User {
  return {
    id: dbUser.id,
    displayName: dbUser.displayName,
    language: dbUser.language as LangCode,
    role: dbUser.role as 'user' | 'agent',
    isDemo: dbUser.isDemo,
    agentLanguages:
      dbUser.agentLanguages && dbUser.agentLanguages.length > 0
        ? (dbUser.agentLanguages as LangCode[])
        : undefined,
  };
}

async function obtainNexconnToken(userId: string, displayName: string): Promise<string> {
  const config = getConfig();

  if (config.NEXCONN_APP_KEY && config.NEXCONN_APP_SECRET) {
    try {
      return await issueNexconnToken({
        userId,
        name: displayName,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Nexconn] Live token issuance failed for ${userId}: ${errorMsg}. Falling back to dev token.`);
      if (config.NODE_ENV === 'production') {
        throw new AppError('NEXCONN_TOKEN_ERROR', `Failed to issue Nexconn token: ${errorMsg}`, 502, true);
      }
    }
  }

  // Fallback for local development/testing without real keys
  return `mock_nexconn_token_${userId}_${Date.now()}`;
}

export async function loginGuest(input: GuestAuthRequest): Promise<AuthResponse> {
  const config = getConfig();
  const userId = generateUserId('u');

  const user = await prisma.user.create({
    data: {
      id: userId,
      displayName: input.displayName.trim(),
      language: input.language,
      role: 'user',
      isDemo: false,
      agentLanguages: [],
    },
  });

  const sessionToken = generateSessionToken();
  const tokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  const nexconnToken = await obtainNexconnToken(user.id, user.displayName);

  return {
    sessionToken,
    user: formatUser(user),
    nexconn: {
      appKey: config.NEXCONN_APP_KEY || 'mock_app_key',
      token: nexconnToken,
      area: config.NEXCONN_AREA || 'SG',
    },
  };
}

export async function loginAgent(input: AgentAuthRequest): Promise<AuthResponse> {
  const config = getConfig();

  if (input.code !== config.AGENT_ACCESS_CODE) {
    throw new AppError('BAD_AGENT_CODE', 'Invalid agent access code', 403, false);
  }

  const userId = generateUserId('u_agent');

  const user = await prisma.user.create({
    data: {
      id: userId,
      displayName: input.displayName.trim(),
      language: input.language,
      role: 'agent',
      isDemo: false,
      agentLanguages: input.agentLanguages,
    },
  });

  const sessionToken = generateSessionToken();
  const tokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  const nexconnToken = await obtainNexconnToken(user.id, user.displayName);

  return {
    sessionToken,
    user: formatUser(user),
    nexconn: {
      appKey: config.NEXCONN_APP_KEY || 'mock_app_key',
      token: nexconnToken,
      area: config.NEXCONN_AREA || 'SG',
    },
  };
}

export async function validateSession(rawToken: string): Promise<User> {
  const tokenHash = hashToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    throw new AppError('UNAUTHORIZED', 'Invalid session token', 401, false);
  }

  if (session.expiresAt <= new Date()) {
    throw new AppError('UNAUTHORIZED', 'Session token has expired', 401, false);
  }

  return formatUser(session.user);
}

export async function getMe(userId: string): Promise<MeResponse> {
  const config = getConfig();

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User record not found', 404, false);
  }

  const nexconnToken = await obtainNexconnToken(user.id, user.displayName);

  return {
    user: formatUser(user),
    nexconn: {
      appKey: config.NEXCONN_APP_KEY || 'mock_app_key',
      token: nexconnToken,
      area: config.NEXCONN_AREA || 'SG',
    },
  };
}

export async function updateMe(userId: string, input: UpdateMeRequest): Promise<MeResponse> {
  const dataToUpdate: { displayName?: string; language?: string } = {};

  if (input.displayName !== undefined) {
    dataToUpdate.displayName = input.displayName.trim();
  }
  if (input.language !== undefined) {
    dataToUpdate.language = input.language;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
  });

  return getMe(user.id);
}
