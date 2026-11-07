import { getNexconnGroupApi } from './client.js';

export interface CreateGroupParams {
  channelId: string;
  name: string;
  owner: string;
  userIds?: string[];
}

/**
 * Creates a Nexconn group channel server-side for support escalation (C6 3-way dispute room).
 */
export async function createEscalationGroupChannel(params: CreateGroupParams): Promise<void> {
  const groupApi = getNexconnGroupApi();

  const response = await groupApi.createGroupChannel({
    channelId: params.channelId,
    name: params.name,
    owner: params.owner,
    userIds: params.userIds ?? [],
  });

  if (response.data.code && response.data.code !== 200 && response.data.code !== 0) {
    throw new Error(`Failed to create Nexconn group channel (code: ${response.data.code})`);
  }
}

/**
 * Adds a member (e.g. claiming support agent) to an existing Nexconn group channel.
 */
export async function addMemberToGroupChannel(channelId: string, userId: string): Promise<void> {
  const groupApi = getNexconnGroupApi();

  const response = await groupApi.joinGroupChannel({
    channelId,
    userIds: [userId],
  });

  if (response.data.code && response.data.code !== 200 && response.data.code !== 0) {
    throw new Error(`Failed to add user to Nexconn group channel (code: ${response.data.code})`);
  }
}

// ponytail: per-process cache of groups we know exist; a restart re-checks each chat once.
const knownChatGroups = new Set<string>();

/**
 * D-029: every buyer+listing chat is its own Nexconn group (members: buyer and seller), keyed by the
 * chat's channelId, so two listings with the same seller never share one conversation.
 * Creates the group the first time; chats created before D-029 are upgraded on first open.
 * Skipped under tests, which mock Nexconn and must never reach the real app.
 */
export async function ensureChatGroupChannel(params: { channelId: string; name: string; buyerId: string; sellerId: string }): Promise<void> {
  if (process.env.NODE_ENV === 'test' || knownChatGroups.has(params.channelId)) return;
  const groupApi = getNexconnGroupApi();
  const { data } = await groupApi.batchGetGroupChannelProfiles({ channelIds: [params.channelId] });
  const exists = data.result?.profiles?.some((p) => p.channelId === params.channelId && (p.owner || p.createdAt));
  if (!exists) {
    await createEscalationGroupChannel({
      channelId: params.channelId,
      name: params.name.slice(0, 64),
      owner: params.sellerId,
      userIds: [params.buyerId, params.sellerId],
    });
  }
  knownChatGroups.add(params.channelId);
}
