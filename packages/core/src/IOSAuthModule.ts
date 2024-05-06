import {authorize, refresh, revoke} from 'react-native-app-auth';

import {
  getPersistedAuthData,
  persistAuthData,
  removePersistedAuthData,
} from './authDataPersist';
import {
  AuthData,
  AuthModuleConfig,
  BaseAuthConfig,
  IAuthModule,
  OmhUserProfile,
} from './types';

const NOT_INITIALIZED = 'Not initialized';
const NOT_SIGNED_IN = 'Not signed in';

export default class AuthModuleIOS implements IAuthModule {
  private config: BaseAuthConfig | null = null;
  private authData: AuthData | null = null;

  constructor(private moduleConfig: AuthModuleConfig) {}

  /**
   * Initializes the authentication provider with the given configuration.
   * @param config Configuration object required for initialization.
   */
  async initialize(config: BaseAuthConfig): Promise<void> {
    this.config = config;
    this.authData = await getPersistedAuthData();
  }

  /**
   * Initiates the sign-in process with the authentication provider.
   */
  async signIn(): Promise<void> {
    const config = this.getConfig();

    const persistedAuthData = await getPersistedAuthData();

    if (persistedAuthData) {
      this.authData = persistedAuthData;
    } else {
      this.authData = await authorize(config);
      await persistAuthData(this.authData);
    }
  }

  /**
   * Retrieves the access token from the authentication provider.
   * @returns The access token if available, otherwise undefined.
   */
  async getAccessToken(): Promise<string | undefined> {
    const authData = this.getAuthData();

    return authData.accessToken;
  }

  /**
   * Obtains user information for the current signed-in user.
   * @returns An object containing user profile information.
   */
  async getUser(): Promise<OmhUserProfile | undefined> {
    return this.moduleConfig.IOSGetUser(this.getAuthData);
  }

  /**
   * Refreshes the access token if it has expired.
   * @returns The new access token if refreshed, otherwise undefined.
   */
  async refreshAccessToken(): Promise<string | undefined> {
    if (this.moduleConfig.IOSRefreshAccessToken instanceof Function) {
      return this.moduleConfig.IOSRefreshAccessToken(this.getAuthData);
    }

    const config = this.getConfig();
    const authData = this.getAuthData();

    const {accessToken, refreshToken, accessTokenExpirationDate} =
      await refresh(config, {refreshToken: authData.refreshToken});

    this.authData = {
      ...authData,
      accessToken,
      accessTokenExpirationDate,
      refreshToken: refreshToken || authData.refreshToken,
    };

    await persistAuthData(this.authData);

    return accessToken;
  }

  /**
   * Revokes the current access token.
   */
  async revokeAccessToken(): Promise<void> {
    if (this.moduleConfig.IOSRevokeAccessToken instanceof Function) {
      return this.moduleConfig.IOSRevokeAccessToken(this.getAuthData);
    }

    const config = this.getConfig();
    const authData = this.getAuthData();

    await revoke(config, {tokenToRevoke: authData.accessToken});
  }

  /**
   * Initiates the sign-out process with the authentication provider.
   */
  async signOut(): Promise<void> {
    await removePersistedAuthData();

    this.authData = null;
  }

  private getConfig(): BaseAuthConfig {
    if (!this.config) {
      throw new Error(NOT_INITIALIZED);
    }

    return this.config;
  }

  private getAuthData = (): AuthData => {
    if (!this.authData) {
      throw new Error(NOT_SIGNED_IN);
    }

    return this.authData;
  };
}
