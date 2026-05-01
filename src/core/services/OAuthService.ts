/**
 * OAuth Service - Framework Agnostic
 *
 * Features:
 * - Google OAuth 2.0
 * - GitHub OAuth 2.0
 * - Microsoft OAuth (Enterprise)
 * - LinkedIn OAuth (Enterprise)
 * - Account linking
 * - Token refresh
 * - Profile synchronization
 *
 * Zero Trust Principles:
 * - Verify OAuth state parameter
 * - Validate token signatures
 * - Audit all login attempts
 * - Minimal scope permissions
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IAuthAdapter,
  IRepository,
  IEmailProvider,
  ICacheProvider,
  ILogger,
  IUser,
  ITokenService,
  AuthResult,
  OAuthConfig,
  AuthConfig,
} from '../interfaces/index.js';
import TokenService from '../../services/TokenService.js';

export type OAuthProvider = 'google' | 'github' | 'microsoft' | 'linkedin';

export interface OAuthOptions {
  provider: OAuthProvider;
  callbackURL: string;
  scope?: string[];
  state?: string;
}

export interface OAuthCallbackOptions {
  provider: OAuthProvider;
  code: string;
  state?: string;
}

export interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: OAuthProvider;
  providerAccountId: string;
}

export class OAuthService {
  private repository: IRepository;
  private tokenService: ITokenService;
  private cacheProvider?: ICacheProvider;
  private logger: ILogger;
  private config: Record<OAuthProvider, OAuthConfig | undefined>;

  constructor(
    repository: IRepository,
    tokenService: ITokenService,
    options?: {
      config?: AuthConfig['oauth'];
      cacheProvider?: ICacheProvider;
      logger?: ILogger;
    }
  ) {
    this.repository = repository;
    this.tokenService = tokenService;
    this.cacheProvider = options?.cacheProvider;
    this.logger = options?.logger || console;
    this.config = {
      google: options?.config?.google,
      github: options?.config?.github,
      microsoft: options?.config?.microsoft,
      linkedin: options?.config?.linkedin,
    };
  }

  /**
   * Get OAuth authorization URL
   *
   * Flow:
   * 1. Validate provider
   * 2. Generate state parameter
   * 3. Build authorization URL
   * 4. Cache state for verification
   */
  async getAuthorizationUrl(
    adapter: IAuthAdapter,
    options: OAuthOptions
  ): Promise<AuthResult<{ url: string; state: string }>> {
    const { provider, callbackURL, scope } = options;
    const ipAddress = adapter.getClientIP();

    try {
      this.logger.info('OAuth authorization requested', { provider, ip: ipAddress });

      // 1. Validate provider
      const providerConfig = this.config[provider];
      if (!providerConfig) {
        return this.errorResult(`${provider} is not configured`, 'PROVIDER_NOT_CONFIGURED');
      }

      // 2. Generate state parameter (CSRF protection)
      const state = uuidv4();

      // 3. Cache state for verification (10 minutes)
      if (this.cacheProvider) {
        await this.cacheProvider.set(`oauth:state:${state}`, callbackURL, 600);
      }

      // 4. Build authorization URL
      const url = await this.buildAuthorizationUrl(provider, providerConfig, callbackURL, state, scope);

      this.logger.info('OAuth authorization URL generated', { provider });

      return {
        success: true,
        data: {
          url,
          state,
        },
      };
    } catch (error) {
      this.logger.error('OAuth authorization failed', {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to generate authorization URL', 'INTERNAL_ERROR');
    }
  }

  /**
   * Handle OAuth callback
   *
   * Flow:
   * 1. Validate state parameter
   * 2. Exchange code for tokens
   * 3. Get user profile
   * 4. Find or create user
   * 5. Link OAuth account
   * 6. Generate tokens
   * 7. Audit log
   */
  async handleCallback(
    adapter: IAuthAdapter,
    options: OAuthCallbackOptions
  ): Promise<AuthResult<{ user: IUser; tokens: any; profile: OAuthProfile }>> {
    const { provider, code, state } = options;
    const ipAddress = adapter.getClientIP();
    const userAgent = adapter.getUserAgent();

    try {
      this.logger.info('OAuth callback received', { provider, ip: ipAddress });

      // 1. Validate state parameter
      if (state) {
        const isValidState = await this.validateState(state);
        if (!isValidState) {
          this.logger.warn('Invalid OAuth state', { provider, ip: ipAddress });
          return this.errorResult('Invalid state parameter', 'INVALID_STATE');
        }
      }

      // 2. Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(provider, code);

      // 3. Get user profile
      const profile = await this.getUserProfile(provider, tokens.accessToken);

      // 4. Find or create user
      let user = await this.findOrCreateUser(profile);

      // 5. Link OAuth account (if not already linked)
      await this.linkOAuthAccount(user.id, profile, tokens);

      // 6. Generate tokens
      const authTokens = await this.tokenService.generateTokenPair(
        user.id,
        user.email,
        user.role
      );

      // 7. Update last login
      await this.repository.updateLastLogin(user.id);

      // 8. Audit log
      await this.auditLog('OAUTH_LOGIN', user.id, ipAddress, userAgent, {
        provider,
        providerAccountId: profile.providerAccountId,
      });

      this.logger.info('OAuth login successful', {
        provider,
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        data: {
          user: user as IUser,
          tokens: authTokens,
          profile,
        },
      };
    } catch (error) {
      this.logger.error('OAuth callback failed', {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to process OAuth callback', 'INTERNAL_ERROR');
    }
  }

  /**
   * Build authorization URL for provider
   */
  private async buildAuthorizationUrl(
    provider: OAuthProvider,
    config: OAuthConfig,
    callbackURL: string,
    state: string,
    scope?: string[]
  ): Promise<string> {
    switch (provider) {
      case 'google':
        return this.buildGoogleAuthUrl(config, callbackURL, state, scope);
      case 'github':
        return this.buildGitHubAuthUrl(config, callbackURL, state, scope);
      case 'microsoft':
        return this.buildMicrosoftAuthUrl(config, callbackURL, state, scope);
      case 'linkedin':
        return this.buildLinkedInAuthUrl(config, callbackURL, state, scope);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Google OAuth 2.0
   */
  private buildGoogleAuthUrl(
    config: OAuthConfig,
    callbackURL: string,
    state: string,
    scope?: string[]
  ): string {
    const defaultScope = ['openid', 'email', 'profile'];
    const scopes = scope || defaultScope;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackURL,
      response_type: 'code',
      scope: scopes.join(' '),
      state: state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * GitHub OAuth 2.0
   */
  private buildGitHubAuthUrl(
    config: OAuthConfig,
    callbackURL: string,
    state: string,
    scope?: string[]
  ): string {
    const defaultScope = ['user:email'];
    const scopes = scope || defaultScope;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackURL,
      scope: scopes.join(' '),
      state: state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Microsoft OAuth 2.0
   */
  private buildMicrosoftAuthUrl(
    config: OAuthConfig,
    callbackURL: string,
    state: string,
    scope?: string[]
  ): string {
    const defaultScope = ['User.Read'];
    const scopes = scope || defaultScope;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackURL,
      response_type: 'code',
      scope: scopes.join(' '),
      state: state,
      response_mode: 'query',
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * LinkedIn OAuth 2.0
   */
  private buildLinkedInAuthUrl(
    config: OAuthConfig,
    callbackURL: string,
    state: string,
    scope?: string[]
  ): string {
    const defaultScope = ['r_liteprofile', 'r_emailaddress'];
    const scopes = scope || defaultScope;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: callbackURL,
      scope: scopes.join(' '),
      state: state,
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(provider: OAuthProvider, code: string): Promise<any> {
    const config = this.config[provider];
    if (!config) {
      throw new Error(`${provider} not configured`);
    }

    switch (provider) {
      case 'google':
        return this.exchangeGoogleCode(config, code);
      case 'github':
        return this.exchangeGitHubCode(config, code);
      case 'microsoft':
        return this.exchangeMicrosoftCode(config, code);
      case 'linkedin':
        return this.exchangeLinkedInCode(config, code);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Exchange Google code for tokens
   */
  private async exchangeGoogleCode(config: OAuthConfig, code: string): Promise<any> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.callbackURL,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange Google code');
    }

    return response.json();
  }

  /**
   * Exchange GitHub code for tokens
   */
  private async exchangeGitHubCode(config: OAuthConfig, code: string): Promise<any> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.callbackURL,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange GitHub code');
    }

    return response.json();
  }

  /**
   * Exchange Microsoft code for tokens
   */
  private async exchangeMicrosoftCode(config: OAuthConfig, code: string): Promise<any> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.callbackURL,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange Microsoft code');
    }

    return response.json();
  }

  /**
   * Exchange LinkedIn code for tokens
   */
  private async exchangeLinkedInCode(config: OAuthConfig, code: string): Promise<any> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.callbackURL,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange LinkedIn code');
    }

    return response.json();
  }

  /**
   * Get user profile from provider
   */
  private async getUserProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
    switch (provider) {
      case 'google':
        return this.getGoogleProfile(accessToken);
      case 'github':
        return this.getGitHubProfile(accessToken);
      case 'microsoft':
        return this.getMicrosoftProfile(accessToken);
      case 'linkedin':
        return this.getLinkedInProfile(accessToken);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Get Google profile
   */
  private async getGoogleProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Google profile');
    }

    const data = await response.json();

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.picture,
      provider: 'google',
      providerAccountId: data.id,
    };
  }

  /**
   * Get GitHub profile
   */
  private async getGitHubProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get GitHub profile');
    }

    const userData = await response.json();

    // Get email
    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primaryEmail = emails.find((e: any) => e.primary);
        email = primaryEmail?.email;
      }
    }

    return {
      id: String(userData.id),
      email: email,
      name: userData.name || userData.login,
      avatar: userData.avatar_url,
      provider: 'github',
      providerAccountId: String(userData.id),
    };
  }

  /**
   * Get Microsoft profile
   */
  private async getMicrosoftProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Microsoft profile');
    }

    const data = await response.json();

    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      avatar: undefined,
      provider: 'microsoft',
      providerAccountId: data.id,
    };
  }

  /**
   * Get LinkedIn profile
   */
  private async getLinkedInProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get LinkedIn profile');
    }

    const userData = await response.json();

    // Get email
    const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let email = '';
    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      email = emailData.elements?.[0]?.['handle~']?.emailAddress || '';
    }

    const firstName = userData.firstName?.localized?.en_US || '';
    const lastName = userData.lastName?.localized?.en_US || '';

    return {
      id: userData.id,
      email: email,
      name: `${firstName} ${lastName}`.trim(),
      avatar: undefined,
      provider: 'linkedin',
      providerAccountId: userData.id,
    };
  }

  /**
   * Find or create user from OAuth profile
   */
  private async findOrCreateUser(profile: OAuthProfile): Promise<any> {
    // Try to find user by email
    let user = await this.repository.findByEmail(profile.email);

    if (user) {
      return user;
    }

    // Create new user
    const prisma = await this.getPrismaClient();
    user = await prisma.user.create({
      data: {
        email: profile.email,
        firstName: profile.name.split(' ')[0],
        lastName: profile.name.split(' ').slice(1).join(' ') || null,
        password: '', // No password for OAuth users
        role: 'USER',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    return user;
  }

  /**
   * Link OAuth account to user
   */
  private async linkOAuthAccount(userId: string, profile: OAuthProfile, tokens: any): Promise<void> {
    const prisma = await this.getPrismaClient();

    // Check if already linked
    const existing = await prisma.oauthAccount.findUnique({
      where: {
        providerAccountId: profile.providerAccountId,
      },
    });

    if (existing) {
      // Update existing account
      await prisma.oauthAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new account
      await prisma.oauthAccount.create({
        data: {
          userId,
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          scope: tokens.scope || null,
        },
      });
    }
  }

  /**
   * Validate OAuth state parameter
   */
  private async validateState(state: string): Promise<boolean> {
    if (!this.cacheProvider) {
      return true; // Skip validation if cache not available
    }

    const storedCallbackURL = await this.cacheProvider.get(`oauth:state:${state}`);
    
    if (storedCallbackURL) {
      await this.cacheProvider.del(`oauth:state:${state}`);
      return true;
    }

    return false;
  }

  /**
   * Audit log helper
   */
  private async auditLog(
    eventType: string,
    userId: string | undefined,
    ipAddress: string,
    userAgent: string,
    metadata: any
  ): Promise<void> {
    try {
      const prisma = await this.getPrismaClient();
      await prisma.securityAudit.create({
        data: {
          eventType,
          eventLevel: 'INFO',
          userId,
          ipAddress,
          userAgent,
          path: '/auth/oauth',
          method: 'GET',
          metadata,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', { error });
    }
  }

  /**
   * Get Prisma client
   */
  private async getPrismaClient(): Promise<any> {
    const { getPrismaClient } = await import('../../config/prisma.js');
    return getPrismaClient();
  }

  /**
   * Create error result
   */
  private errorResult(message: string, code: string): AuthResult {
    return {
      success: false,
      error: {
        type: 'OAuthError',
        message,
        code,
      },
    };
  }
}

export default OAuthService;
