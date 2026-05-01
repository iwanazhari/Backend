/**
 * Impossible Travel Detection Service
 * 
 * Features:
 * - Geolocation-based login detection
 * - Calculate travel speed between logins
 * - Detect suspicious login patterns
 * - Real-time risk scoring
 * - Auto-block suspicious logins
 * - Zero Trust principles
 * 
 * Detection Rules:
 * 1. Login from different cities in < 2 hours
 * 2. Login from different countries in < 4 hours
 * 3. Login speed exceeds physical possibility
 * 4. Login from high-risk locations
 * 
 * @see https://en.wikipedia.org/wiki/Impossible_travel
 */

export interface Location {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  timezone: string;
}

export interface LoginAttempt {
  id: string;
  userId: string;
  timestamp: Date;
  ipAddress: string;
  location: Location;
  userAgent: string;
  deviceId: string;
  success: boolean;
}

export interface TravelDistance {
  from: Location;
  to: Location;
  distanceKm: number;
  timeDiffHours: number;
  requiredSpeedKmh: number;
  isPossible: boolean;
}

export interface RiskAssessment {
  userId: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  recommendations: string[];
  shouldBlock: boolean;
}

export interface HighRiskLocation {
  country: string;
  cities?: string[];
  reason: string;
  riskScore: number;
}

class ImpossibleTravelService {
  private loginHistory: Map<string, LoginAttempt[]>;
  private highRiskLocations: HighRiskLocation[];
  private maxPhysicalSpeedKmh = 900; // Commercial aircraft speed

  constructor() {
    this.loginHistory = new Map();
    this.highRiskLocations = [];
    this.setupHighRiskLocations();
  }

  /**
   * Setup high-risk locations database
   */
  private setupHighRiskLocations(): void {
    this.highRiskLocations = [
      {
        country: 'KP', // North Korea
        reason: 'High cyber threat activity',
        riskScore: 90,
      },
      {
        country: 'IR', // Iran
        reason: 'High cyber threat activity',
        riskScore: 75,
      },
      {
        country: 'RU', // Russia
        cities: ['Moscow', 'St Petersburg'],
        reason: 'Elevated cyber threat activity',
        riskScore: 60,
      },
      {
        country: 'CN', // China
        cities: ['Beijing', 'Shanghai'],
        reason: 'Elevated cyber threat activity',
        riskScore: 50,
      },
    ];
  }

  /**
   * Record login attempt
   */
  recordLogin(attempt: LoginAttempt): void {
    const history = this.loginHistory.get(attempt.userId) || [];
    history.push(attempt);
    
    // Keep last 100 logins
    if (history.length > 100) {
      history.shift();
    }
    
    this.loginHistory.set(attempt.userId, history);
  }

  /**
   * Check for impossible travel
   */
  async checkImpossibleTravel(
    userId: string,
    currentAttempt: LoginAttempt
  ): Promise<{ detected: boolean; travel?: TravelDistance }> {
    const history = this.loginHistory.get(userId);
    
    if (!history || history.length === 0) {
      return { detected: false };
    }

    // Get last successful login
    const lastLogin = history
      .filter(l => l.success && l.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (!lastLogin) {
      return { detected: false };
    }

    // Calculate distance and time
    const distance = this.calculateDistance(
      lastLogin.location,
      currentAttempt.location
    );

    const timeDiff = (currentAttempt.timestamp.getTime() - lastLogin.timestamp.getTime()) / (1000 * 60 * 60); // hours

    // Calculate required travel speed
    const requiredSpeed = timeDiff > 0 ? distance / timeDiff : Infinity;

    const travel: TravelDistance = {
      from: lastLogin.location,
      to: currentAttempt.location,
      distanceKm: distance,
      timeDiffHours: timeDiff,
      requiredSpeedKmh: requiredSpeed,
      isPossible: requiredSpeed <= this.maxPhysicalSpeedKmh,
    };

    // Detect impossible travel
    const detected = !travel.isPossible && timeDiff < 2; // Less than 2 hours

    return {
      detected,
      travel,
    };
  }

  /**
   * Calculate distance between two locations using Haversine formula
   */
  private calculateDistance(from: Location, to: Location): number {
    const R = 6371; // Earth's radius in km
    
    const lat1Rad = (from.latitude * Math.PI) / 180;
    const lat2Rad = (to.latitude * Math.PI) / 180;
    const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Assess login risk
   */
  async assessRisk(
    userId: string,
    attempt: LoginAttempt
  ): Promise<RiskAssessment> {
    const riskScore = 0;
    const reasons: string[] = [];
    const recommendations: string[] = [];

    // Check impossible travel
    const travelCheck = await this.checkImpossibleTravel(userId, attempt);
    if (travelCheck.detected && travelCheck.travel) {
      riskScore += 50;
      reasons.push(`Impossible travel detected: ${travelCheck.travel.from.city} → ${travelCheck.travel.to.city} in ${travelCheck.travel.timeDiffHours.toFixed(1)} hours`);
      recommendations.push('Require additional verification');
    }

    // Check high-risk location
    const locationRisk = this.checkHighRiskLocation(attempt.location);
    if (locationRisk > 0) {
      riskScore += locationRisk;
      reasons.push(`Login from high-risk location: ${attempt.location.country}`);
      recommendations.push('Monitor account activity closely');
    }

    // Check new device
    const isNewDevice = await this.checkNewDevice(userId, attempt.deviceId);
    if (isNewDevice) {
      riskScore += 20;
      reasons.push('Login from unrecognized device');
      recommendations.push('Send device verification email');
    }

    // Check new location
    const isNewLocation = await this.checkNewLocation(userId, attempt.location);
    if (isNewLocation) {
      riskScore += 15;
      reasons.push('Login from new location');
      recommendations.push('Verify user identity');
    }

    // Check unusual time
    const isUnusualTime = this.checkUnusualTime(attempt);
    if (isUnusualTime) {
      riskScore += 10;
      reasons.push('Login at unusual time');
    }

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);
    const shouldBlock = riskScore >= 80;

    return {
      userId,
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      reasons,
      recommendations,
      shouldBlock,
    };
  }

  /**
   * Check if location is high-risk
   */
  private checkHighRiskLocation(location: Location): number {
    for (const highRisk of this.highRiskLocations) {
      if (highRisk.country === location.country) {
        if (!highRisk.cities || highRisk.cities.includes(location.city)) {
          return highRisk.riskScore;
        }
      }
    }
    return 0;
  }

  /**
   * Check if device is new for user
   */
  private async checkNewDevice(userId: string, deviceId: string): Promise<boolean> {
    const history = this.loginHistory.get(userId);
    if (!history) return true;

    const knownDevices = new Set(history.map(h => h.deviceId));
    return !knownDevices.has(deviceId);
  }

  /**
   * Check if location is new for user
   */
  private async checkNewLocation(userId: string, location: Location): Promise<boolean> {
    const history = this.loginHistory.get(userId);
    if (!history) return true;

    for (const login of history) {
      if (
        login.location.city === location.city &&
        login.location.country === location.country
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if login time is unusual
   */
  private checkUnusualTime(attempt: LoginAttempt): boolean {
    const hour = attempt.timestamp.getUTCHours();
    // Unusual: 2 AM - 5 AM UTC
    return hour >= 2 && hour <= 5;
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskAssessment['riskLevel'] {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get user's typical locations
   */
  getTypicalLocations(userId: string): Location[] {
    const history = this.loginHistory.get(userId) || [];
    const locations = new Map<string, Location>();

    // Get last 10 logins
    const recentLogins = history.slice(-10);

    for (const login of recentLogins) {
      const key = `${login.location.city},${login.location.country}`;
      if (!locations.has(key)) {
        locations.set(key, login.location);
      }
    }

    return Array.from(locations.values());
  }

  /**
   * Get login timeline for user
   */
  getLoginTimeline(userId: string): LoginAttempt[] {
    return this.loginHistory.get(userId) || [];
  }

  /**
   * Clear old login history
   */
  cleanupOldHistory(maxAgeDays: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    for (const [userId, history] of this.loginHistory.entries()) {
      const filtered = history.filter(h => h.timestamp > cutoffDate);
      this.loginHistory.set(userId, filtered);
    }
  }

  /**
   * Add custom high-risk location
   */
  addHighRiskLocation(location: HighRiskLocation): void {
    this.highRiskLocations.push(location);
  }

  /**
   * Set maximum physical travel speed
   */
  setMaxTravelSpeed(speedKmh: number): void {
    this.maxPhysicalSpeedKmh = speedKmh;
  }
}

export default ImpossibleTravelService;
