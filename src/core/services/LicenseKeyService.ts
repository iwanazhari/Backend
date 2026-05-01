/**
 * License Key Service - Commercial Tiers
 * 
 * Features:
 * - Generate license keys
 * - Validate license keys
 * - Tier-based features (Starter, Pro, Enterprise)
 * - Expiration tracking
 * - Usage limits
 * - Activation management
 * 
 * Tiers:
 * - Starter: Free, basic features
 * - Pro: $99/mo, advanced features
 * - Enterprise: Custom, all features
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export type LicenseTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface LicenseKey {
  id: string;
  key: string;
  tier: LicenseTier;
  status: 'active' | 'suspended' | 'expired' | 'revoked';
  activatedAt?: Date;
  expiresAt?: Date;
  maxActivations: number;
  currentActivations: number;
  features: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicenseValidation {
  valid: boolean;
  license?: LicenseKey;
  error?: string;
  remainingDays?: number;
}

export interface TierFeatures {
  [key: string]: string[];
}

class LicenseKeyService {
  private licenses: Map<string, LicenseKey>;
  private readonly TIER_FEATURES: TierFeatures;

  constructor() {
    this.licenses = new Map();
    this.TIER_FEATURES = {
      STARTER: [
        'email_password_auth',
        'paseto_tokens',
        'basic_rate_limit',
        'community_support',
      ],
      PRO: [
        'email_password_auth',
        'paseto_tokens',
        'magic_link',
        'otp_auth',
        'oauth_social_login',
        'session_management',
        'advanced_rate_limit',
        'email_support',
      ],
      ENTERPRISE: [
        'email_password_auth',
        'paseto_tokens',
        'magic_link',
        'otp_auth',
        'oauth_social_login',
        'session_management',
        'sso_saml_oidc',
        'webauthn_passkey',
        'rbac_abac',
        'impossible_travel',
        'account_lockout',
        'advanced_audit',
        'webhooks',
        'multi_tenancy',
        'priority_support',
        'sla_24_7',
      ],
    };
  }

  /**
   * Generate license key
   */
  generateLicenseKey(
    tier: LicenseTier,
    validMonths: number = 12,
    maxActivations: number = 5
  ): LicenseKey {
    const key = this.generateSecureKey();
    const now = new Date();
    const expiresAt = new Date(now.setMonth(now.getMonth() + validMonths));

    const license: LicenseKey = {
      id: uuidv4(),
      key,
      tier,
      status: 'active',
      maxActivations,
      currentActivations: 0,
      features: this.TIER_FEATURES[tier],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt,
    };

    this.licenses.set(key, license);
    return license;
  }

  /**
   * Generate secure license key format: XXXX-XXXX-XXXX-XXXX
   */
  private generateSecureKey(): string {
    const segments = 4;
    const segmentLength = 4;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    const segments_array = [];
    for (let i = 0; i < segments; i++) {
      let segment = '';
      for (let j = 0; j < segmentLength; j++) {
        const randomIndex = crypto.randomInt(0, chars.length);
        segment += chars[randomIndex];
      }
      segments_array.push(segment);
    }
    
    return segments_array.join('-');
  }

  /**
   * Validate license key
   */
  validateLicenseKey(key: string): LicenseValidation {
    const license = this.licenses.get(key);

    if (!license) {
      return {
        valid: false,
        error: 'Invalid license key',
      };
    }

    if (license.status !== 'active') {
      return {
        valid: false,
        license,
        error: `License is ${license.status}`,
      };
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      return {
        valid: false,
        license,
        error: 'License has expired',
      };
    }

    if (license.currentActivations >= license.maxActivations) {
      return {
        valid: false,
        license,
        error: 'Maximum activations reached',
      };
    }

    const remainingDays = license.expiresAt
      ? Math.ceil((license.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : undefined;

    return {
      valid: true,
      license,
      remainingDays,
    };
  }

  /**
   * Activate license
   */
  activateLicense(key: string, instanceId: string): LicenseValidation {
    const validation = this.validateLicenseKey(key);

    if (!validation.valid) {
      return validation;
    }

    const license = validation.license!;
    license.currentActivations++;
    license.activatedAt = new Date();
    license.updatedAt = new Date();
    license.metadata.lastActivatedInstance = instanceId;

    return {
      valid: true,
      license,
      remainingDays: validation.remainingDays,
    };
  }

  /**
   * Check if feature is enabled for license
   */
  hasFeature(key: string, feature: string): boolean {
    const validation = this.validateLicenseKey(key);
    
    if (!validation.valid || !validation.license) {
      return false;
    }

    return validation.license.features.includes(feature);
  }

  /**
   * Get available features for tier
   */
  getFeaturesForTier(tier: LicenseTier): string[] {
    return this.TIER_FEATURES[tier] || [];
  }

  /**
   * Upgrade license tier
   */
  upgradeLicense(key: string, newTier: LicenseTier): LicenseValidation {
    const license = this.licenses.get(key);

    if (!license) {
      return {
        valid: false,
        error: 'License not found',
      };
    }

    license.tier = newTier;
    license.features = this.TIER_FEATURES[newTier];
    license.updatedAt = new Date();

    return {
      valid: true,
      license,
    };
  }

  /**
   * Suspend license
   */
  suspendLicense(key: string, reason: string): void {
    const license = this.licenses.get(key);
    if (license) {
      license.status = 'suspended';
      license.metadata.suspensionReason = reason;
      license.updatedAt = new Date();
    }
  }

  /**
   * Revoke license
   */
  revokeLicense(key: string, reason: string): void {
    const license = this.licenses.get(key);
    if (license) {
      license.status = 'revoked';
      license.metadata.revocationReason = reason;
      license.updatedAt = new Date();
    }
  }

  /**
   * Get all licenses
   */
  getAllLicenses(): LicenseKey[] {
    return Array.from(this.licenses.values());
  }

  /**
   * Get licenses by tier
   */
  getLicensesByTier(tier: LicenseTier): LicenseKey[] {
    return Array.from(this.licenses.values()).filter(l => l.tier === tier);
  }

  /**
   * Get expiring licenses
   */
  getExpiringLicenses(daysThreshold: number = 30): LicenseKey[] {
    const threshold = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000);
    
    return Array.from(this.licenses.values()).filter(l => 
      l.expiresAt && l.expiresAt <= threshold && l.status === 'active'
    );
  }

  /**
   * Cleanup expired licenses
   */
  cleanupExpiredLicenses(): number {
    let cleaned = 0;
    const now = new Date();

    for (const [key, license] of this.licenses.entries()) {
      if (license.expiresAt && license.expiresAt < now) {
        license.status = 'expired';
        license.updatedAt = new Date();
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Verify license signature (for offline validation)
   */
  verifyLicenseSignature(key: string, signature: string, publicKey: string): boolean {
    // In production, verify cryptographic signature
    const verifier = crypto.createVerify('SHA256');
    verifier.update(key);
    verifier.end();
    
    return verifier.verify(publicKey, signature, 'base64');
  }

  /**
   * Sign license (for offline validation)
   */
  signLicense(key: string, privateKey: string): string {
    const signer = crypto.createSign('SHA256');
    signer.update(key);
    signer.end();
    
    return signer.sign(privateKey, 'base64');
  }
}

export default LicenseKeyService;
