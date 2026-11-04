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
