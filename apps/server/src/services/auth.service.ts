import { randomBytes, createHash, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type {
  SignupRequest,
  SigninRequest,
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

export async function obtainNexconnToken(userId: string, displayName: string): Promise<string> {
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

/* ── Email + password accounts (DHRUMIL-T21) ── */

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const key = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// ponytail: in-memory sign-in throttle per email (10 failures per 15 min), per server instance.
// Move it to the DB or Redis if the server ever runs as more than one instance.
const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;
function checkThrottle(email: string) {
  const f = failures.get(email);
  if (f && f.until > Date.now() && f.count >= 10) {
    throw new AppError('TOO_MANY_ATTEMPTS', 'Too many sign-in attempts. Try again in a few minutes.', 429, true);
  }
}
function noteFailure(email: string) {
  const f = failures.get(email);
  const fresh = !f || f.until <= Date.now();
  failures.set(email, { count: fresh ? 1 : f.count + 1, until: fresh ? Date.now() + WINDOW_MS : f.until });
}

async function issueSession(user: DbUserLike & { email?: string | null }): Promise<AuthResponse> {
  const config = getConfig();
  const sessionToken = generateSessionToken();
  await prisma.session.create({
    data: { tokenHash: hashToken(sessionToken), userId: user.id, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  });
  const nexconnToken = await obtainNexconnToken(user.id, user.displayName);
  return {
    sessionToken,
    user: formatUser(user),
    nexconn: { appKey: config.NEXCONN_APP_KEY || 'mock_app_key', token: nexconnToken, area: config.NEXCONN_AREA || 'SG' },
    ...(user.email ? { email: user.email } : {}),
  };
}

const EMAIL_TAKEN = () => new AppError('EMAIL_TAKEN', 'An account with this email already exists. Sign in instead.', 409, false);

/**
 * Creates an account. With a guest's session token, that guest becomes the account (chats and listings kept);
 * otherwise a new user is created. Demo and agent sessions are never upgraded.
 */
export async function signup(input: SignupRequest, guestToken?: string): Promise<AuthResponse> {
  if (await prisma.user.findUnique({ where: { email: input.email } })) throw EMAIL_TAKEN();

  const passwordHash = await hashPassword(input.password);
  let guestId: string | undefined;
  if (guestToken) {
    const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(guestToken) }, include: { user: true } });
    const u = session && session.expiresAt > new Date() ? session.user : null;
    if (u && u.role === 'user' && !u.isDemo && !u.email) guestId = u.id;
  }

  try {
    const user = guestId
      ? await prisma.user.update({
          where: { id: guestId },
          data: { email: input.email, passwordHash, displayName: input.displayName.trim(), language: input.language },
        })
      : await prisma.user.create({
          data: {
            id: generateUserId('u'),
            displayName: input.displayName.trim(),
            language: input.language,
            role: 'user',
            isDemo: false,
            agentLanguages: [],
            email: input.email,
            passwordHash,
          },
        });
    return await issueSession(user);
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') throw EMAIL_TAKEN();
    throw err;
  }
}

export async function signin(input: SigninRequest): Promise<AuthResponse> {
  checkThrottle(input.email);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // The same answer for an unknown email and a wrong password, so the form can't be used to find accounts.
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    noteFailure(input.email);
    throw new AppError('BAD_CREDENTIALS', 'That email and password don’t match. Check them and try again.', 401, false);
  }
  failures.delete(input.email);
  return issueSession(user);
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
    ...(user.email ? { email: user.email } : {}),
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

