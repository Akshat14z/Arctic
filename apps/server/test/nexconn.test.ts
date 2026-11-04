import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNexconnConfig, resetNexconnClientsForTesting } from '../src/nexconn/client.js';
import { issueNexconnToken } from '../src/nexconn/tokens.js';
import * as clientModule from '../src/nexconn/client.js';
import { resetConfigForTesting } from '../src/config.js';

describe('Nexconn Server SDK Adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    resetNexconnClientsForTesting();
  });

  it('throws helpful error if credentials are missing', () => {
    delete process.env.NEXCONN_APP_KEY;
    delete process.env.NEXCONN_APP_SECRET;
    resetConfigForTesting();

    expect(() => getNexconnConfig()).toThrow(
      'NEXCONN_APP_KEY and NEXCONN_APP_SECRET must be configured'
    );
  });

  it('initializes Configuration with credentials and primary/backup domains', () => {
    process.env.NEXCONN_APP_KEY = 'test_app_key';
    process.env.NEXCONN_APP_SECRET = 'test_app_secret';
    resetConfigForTesting();

    const config = getNexconnConfig();
    expect(config).toBeDefined();
    expect(config.getActiveHost()).toBe('https://api.sg-light-api.com');
  });

  it('issues token successfully from UserManagementApi', async () => {
    const mockUserApi = {
      issueAccessToken: vi.fn().mockResolvedValue({
        data: {
          code: 200,
          result: {
            userId: 'u_test123',
            accessToken: 'mock_token_abc_xyz',
          },
        },
      }),
    };

    vi.spyOn(clientModule, 'getNexconnUserApi').mockReturnValue(mockUserApi as any);

    const token = await issueNexconnToken({
      userId: 'u_test123',
      name: 'Test Buyer',
    });

    expect(token).toBe('mock_token_abc_xyz');
    expect(mockUserApi.issueAccessToken).toHaveBeenCalledWith({
      userId: 'u_test123',
      name: 'Test Buyer',
      avatarUrl: undefined,
    });
  });

  it('throws error when Nexconn returns no access token', async () => {
    const mockUserApi = {
      issueAccessToken: vi.fn().mockResolvedValue({
        data: {
          code: 400,
          result: null,
        },
      }),
    };

    vi.spyOn(clientModule, 'getNexconnUserApi').mockReturnValue(mockUserApi as any);

    await expect(
      issueNexconnToken({
        userId: 'u_fail',
        name: 'Fail User',
      })
    ).rejects.toThrow('Nexconn token generation returned no access token (code: 400)');
  });
});
