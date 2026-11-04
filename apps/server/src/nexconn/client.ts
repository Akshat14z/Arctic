import {
  Configuration,
  UserManagementApi,
  GroupChannelManagementApi,
  MessageManagementApi,
  SystemMessagesApi,
} from '@nexconn/server-sdk';
import { getConfig } from '../config.js';

let userApiInstance: UserManagementApi | null = null;
let groupApiInstance: GroupChannelManagementApi | null = null;
let messageApiInstance: MessageManagementApi | null = null;
let systemMessagesApiInstance: SystemMessagesApi | null = null;

export function getNexconnConfig(): Configuration {
  const env = getConfig();

  const appKey = env.NEXCONN_APP_KEY;
  const appSecret = env.NEXCONN_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error('NEXCONN_APP_KEY and NEXCONN_APP_SECRET must be configured');
  }

  const primaryDomain = env.NEXCONN_PRIMARY_API_DOMAIN || 'https://api.nexconn.ai';
  const backupDomain = env.NEXCONN_SECONDARY_API_DOMAIN || 'https://api-backup.nexconn.ai';

  const config = new Configuration();
  config.setNexconnCredentials(appKey, appSecret);
  config.setPrimaryBackupDomains(primaryDomain, backupDomain);

  return config;
}

export function getNexconnUserApi(): UserManagementApi {
  if (!userApiInstance) {
    const config = getNexconnConfig();
    userApiInstance = new UserManagementApi(config);
  }
  return userApiInstance;
}

export function getNexconnGroupApi(): GroupChannelManagementApi {
  if (!groupApiInstance) {
    const config = getNexconnConfig();
    groupApiInstance = new GroupChannelManagementApi(config);
  }
  return groupApiInstance;
}

export function getNexconnMessageApi(): MessageManagementApi {
  if (!messageApiInstance) {
    const config = getNexconnConfig();
    messageApiInstance = new MessageManagementApi(config);
  }
  return messageApiInstance;
}

export function getNexconnSystemMessagesApi(): SystemMessagesApi {
  if (!systemMessagesApiInstance) {
    const config = getNexconnConfig();
    systemMessagesApiInstance = new SystemMessagesApi(config);
  }
  return systemMessagesApiInstance;
}

export function resetNexconnClientsForTesting(): void {
  userApiInstance = null;
  groupApiInstance = null;
  messageApiInstance = null;
  systemMessagesApiInstance = null;
}
