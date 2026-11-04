import { getNexconnUserApi } from './client.js';

export interface IssueTokenParams {
  userId: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Issues a real Nexconn connection token for a given user via Nexconn Server SDK.
 * The client browser uses this token with NCEngine.connect({ token }).
 */
export async function issueNexconnToken(params: IssueTokenParams): Promise<string> {
  const userApi = getNexconnUserApi();

  const response = await userApi.issueAccessToken({
    userId: params.userId,
    name: params.name,
    avatarUrl: params.avatarUrl,
  });

  const accessToken = response.data.result?.accessToken;
  if (!accessToken) {
    throw new Error(
      `Nexconn token generation returned no access token (code: ${response.data.code})`
    );
  }

  return accessToken;
}

