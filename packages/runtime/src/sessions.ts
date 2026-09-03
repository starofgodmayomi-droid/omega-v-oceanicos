/**
 * Advanced Session Management & Context Tracking System
 * Enterprise-grade session management with device tracking, geolocation, and context persistence
 */

export type SessionStatus = 'active' | 'expired' | 'invalidated' | 'suspended';
export type ContextEventType =
  | 'session_created'
  | 'session_refreshed'
  | 'session_expired'
  | 'session_invalidated'
  | 'context_updated'
  | 'device_detected'
  | 'location_updated';

export interface SessionMetadata {
  id: string;
  userId: string;
  tokenHash: string;
  status: SessionStatus;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  refreshToken?: string;
  refreshExpiresAt?: number;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  city?: string;
  metadata?: Record<string, any>;
}

export interface UserContext {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  correlationId: string;
  timestamp: number;
  permissions?: string[];
  roles?: string[];
  metadata?: Record<string, any>;
}

export interface DeviceInfo {
  deviceId: string;
  userId: string;
  type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  firstSeenAt: number;
  lastSeenAt: number;
  trustedAt?: number;
}

export interface LocationInfo {
  sessionId: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  country: string;
  city: string;
  region: string;
  timezone: string;
  timestamp: number;
  isAnomaly?: boolean;
}

export interface SessionContextEvent {
  id: string;
  sessionId: string;
  userId: string;
  eventType: ContextEventType;
  timestamp: number;
  ipAddress: string;
  deviceId?: string;
  details?: Record<string, any>;
}

/**
 * SessionManager: Create and manage user sessions
 */
export class SessionManager {
  private sessions: Map<string, SessionMetadata> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private tokenIndex: Map<string, string> = new Map();

  createSession(
    userId: string,
    tokenHash: string,
    ipAddress: string,
    userAgent: string,
    expiresIn: number = 3600000
  ): SessionMetadata {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const metadata: SessionMetadata = {
      id: sessionId,
      userId,
      tokenHash,
      status: 'active',
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + expiresIn,
      ipAddress,
      userAgent,
    };

    this.sessions.set(sessionId, metadata);
    this.tokenIndex.set(tokenHash, sessionId);

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    return metadata;
  }

  getSession(sessionId: string): SessionMetadata | undefined {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'active' && session.expiresAt > Date.now()) {
      session.lastActivityAt = Date.now();
      return session;
    }
    return undefined;
  }

  getSessionByToken(tokenHash: string): SessionMetadata | undefined {
    const sessionId = this.tokenIndex.get(tokenHash);
    return sessionId ? this.getSession(sessionId) : undefined;
  }

  getUserSessions(userId: string): SessionMetadata[] {
    const sessionIds = this.userSessions.get(userId) || new Set();
    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id)!)
      .filter((s) => s.status === 'active' && s.expiresAt > Date.now());
  }

  refreshSession(sessionId: string, expiresIn: number = 3600000): SessionMetadata | undefined {
    const session = this.getSession(sessionId);
    if (!session) return undefined;

    session.expiresAt = Date.now() + expiresIn;
    session.lastActivityAt = Date.now();
    return session;
  }

  invalidateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'invalidated';
    return true;
  }

  invalidateUserSessions(userId: string): number {
    const sessionIds = this.userSessions.get(userId) || new Set();
    let count = 0;

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'invalidated';
        count++;
      }
    }

    return count;
  }

  expireSessions(): number {
    let count = 0;
    const now = Date.now();

    for (const session of this.sessions.values()) {
      if (session.expiresAt <= now && session.status === 'active') {
        session.status = 'expired';
        count++;
      }
    }

    return count;
  }

  setDeviceInfo(sessionId: string, deviceId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.deviceId = deviceId;
    return true;
  }

  setLocation(
    sessionId: string,
    latitude: number,
    longitude: number,
    country: string,
    city: string
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.latitude = latitude;
    session.longitude = longitude;
    session.country = country;
    session.city = city;
    return true;
  }

  getActiveSessions(): SessionMetadata[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status === 'active' && s.expiresAt > Date.now()
    );
  }

  listSessions(): SessionMetadata[] {
    return Array.from(this.sessions.values());
  }

  async clear(): Promise<void> {
    this.sessions.clear();
    this.userSessions.clear();
    this.tokenIndex.clear();
  }
}

/**
 * ContextManager: Track user context across requests
 */
export class ContextManager {
  private contexts: Map<string, UserContext> = new Map();
  private requestIndex: Map<string, string> = new Map();

  establishContext(
    userId: string,
    sessionId: string,
    ipAddress: string,
    userAgent: string,
    requestId: string
  ): UserContext {
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const context: UserContext = {
      userId,
      sessionId,
      ipAddress,
      userAgent,
      requestId,
      correlationId,
      timestamp: Date.now(),
    };

    this.contexts.set(correlationId, context);
    this.requestIndex.set(requestId, correlationId);
    return context;
  }

  getContext(correlationId: string): UserContext | undefined {
    return this.contexts.get(correlationId);
  }

  getContextByRequest(requestId: string): UserContext | undefined {
    const correlationId = this.requestIndex.get(requestId);
    return correlationId ? this.contexts.get(correlationId) : undefined;
  }

  updateContext(correlationId: string, updates: Partial<UserContext>): UserContext | undefined {
    const context = this.contexts.get(correlationId);
    if (!context) return undefined;

    Object.assign(context, updates);
    return context;
  }

  addPermissions(correlationId: string, permissions: string[]): boolean {
    const context = this.contexts.get(correlationId);
    if (!context) return false;

    if (!context.permissions) {
      context.permissions = [];
    }
    context.permissions.push(...permissions);
    return true;
  }

  addRoles(correlationId: string, roles: string[]): boolean {
    const context = this.contexts.get(correlationId);
    if (!context) return false;

    if (!context.roles) {
      context.roles = [];
    }
    context.roles.push(...roles);
    return true;
  }

  listContexts(): UserContext[] {
    return Array.from(this.contexts.values());
  }

  async clear(): Promise<void> {
    this.contexts.clear();
    this.requestIndex.clear();
  }
}

/**
 * DeviceTracker: Track and manage user devices
 */
export class DeviceTracker {
  private devices: Map<string, DeviceInfo> = new Map();
  private userDevices: Map<string, Set<string>> = new Map();

  registerDevice(
    userId: string,
    type: DeviceInfo['type'],
    os: string,
    osVersion: string,
    browser: string,
    browserVersion: string
  ): DeviceInfo {
    const deviceId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const device: DeviceInfo = {
      deviceId,
      userId,
      type,
      os,
      osVersion,
      browser,
      browserVersion,
      firstSeenAt: now,
      lastSeenAt: now,
    };

    this.devices.set(deviceId, device);

    if (!this.userDevices.has(userId)) {
      this.userDevices.set(userId, new Set());
    }
    this.userDevices.get(userId)!.add(deviceId);

    return device;
  }

  getDevice(deviceId: string): DeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  getUserDevices(userId: string): DeviceInfo[] {
    const deviceIds = this.userDevices.get(userId) || new Set();
    return Array.from(deviceIds)
      .map((id) => this.devices.get(id)!)
      .filter(Boolean);
  }

  updateLastSeen(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.lastSeenAt = Date.now();
    return true;
  }

  trustDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.trustedAt = Date.now();
    return true;
  }

  isTrusted(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    return device ? device.trustedAt !== undefined : false;
  }

  removeDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    const userDevices = this.userDevices.get(device.userId);
    if (userDevices) {
      userDevices.delete(deviceId);
    }

    return this.devices.delete(deviceId);
  }

  listDevices(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  async clear(): Promise<void> {
    this.devices.clear();
    this.userDevices.clear();
  }
}

/**
 * LocationTracker: Track session locations and detect anomalies
 */
export class LocationTracker {
  private locations: Map<string, LocationInfo[]> = new Map();
  private lastLocation: Map<string, LocationInfo> = new Map();

  recordLocation(
    sessionId: string,
    userId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
    country: string,
    city: string,
    region: string,
    timezone: string
  ): LocationInfo {
    const location: LocationInfo = {
      sessionId,
      userId,
      latitude,
      longitude,
      accuracy,
      country,
      city,
      region,
      timezone,
      timestamp: Date.now(),
    };

    if (!this.locations.has(sessionId)) {
      this.locations.set(sessionId, []);
    }
    this.locations.get(sessionId)!.push(location);
    this.lastLocation.set(sessionId, location);

    return location;
  }

  getLastLocation(sessionId: string): LocationInfo | undefined {
    return this.lastLocation.get(sessionId);
  }

  getSessionLocations(sessionId: string): LocationInfo[] {
    return this.locations.get(sessionId) || [];
  }

  detectAnomalies(sessionId: string, latitude: number, longitude: number): boolean {
    const lastLocation = this.lastLocation.get(sessionId);
    if (!lastLocation) return false;

    const distance = this.calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      latitude,
      longitude
    );
    const timeDiff = Date.now() - lastLocation.timestamp;

    if (distance === 0) return false;

    if (timeDiff < 60000) {
      return distance > 0.5;
    }

    const speed = distance / (timeDiff / 3600000);
    const maxSpeed = 900;

    return speed > maxSpeed;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async clear(): Promise<void> {
    this.locations.clear();
    this.lastLocation.clear();
  }
}

/**
 * SessionAuditor: Track all session lifecycle events
 */
export class SessionAuditor {
  private events: SessionContextEvent[] = [];

  logEvent(
    sessionId: string,
    userId: string,
    eventType: ContextEventType,
    ipAddress: string,
    deviceId?: string,
    details?: Record<string, any>
  ): SessionContextEvent {
    const event: SessionContextEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      userId,
      eventType,
      timestamp: Date.now(),
      ipAddress,
      deviceId,
      details,
    };

    this.events.push(event);
    return event;
  }

  getSessionEvents(sessionId: string): SessionContextEvent[] {
    return this.events.filter((e) => e.sessionId === sessionId);
  }

  getUserEvents(userId: string, limit: number = 100): SessionContextEvent[] {
    return this.events.filter((e) => e.userId === userId).slice(-limit);
  }

  getEventsByType(eventType: ContextEventType, limit: number = 100): SessionContextEvent[] {
    return this.events.filter((e) => e.eventType === eventType).slice(-limit);
  }

  getEvents(limit: number = 100): SessionContextEvent[] {
    return this.events.slice(-limit);
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}

/**
 * SessionHub: Unified session orchestration
 */
export class SessionHub {
  private sessionManager: SessionManager;
  private contextManager: ContextManager;
  private deviceTracker: DeviceTracker;
  private locationTracker: LocationTracker;
  private auditor: SessionAuditor;

  constructor() {
    this.sessionManager = new SessionManager();
    this.contextManager = new ContextManager();
    this.deviceTracker = new DeviceTracker();
    this.locationTracker = new LocationTracker();
    this.auditor = new SessionAuditor();
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getContextManager(): ContextManager {
    return this.contextManager;
  }

  getDeviceTracker(): DeviceTracker {
    return this.deviceTracker;
  }

  getLocationTracker(): LocationTracker {
    return this.locationTracker;
  }

  getAuditor(): SessionAuditor {
    return this.auditor;
  }

  createSessionWithContext(
    userId: string,
    tokenHash: string,
    ipAddress: string,
    userAgent: string,
    expiresIn: number = 3600000
  ): { session: SessionMetadata; context: UserContext } {
    const session = this.sessionManager.createSession(
      userId,
      tokenHash,
      ipAddress,
      userAgent,
      expiresIn
    );

    const context = this.contextManager.establishContext(
      userId,
      session.id,
      ipAddress,
      userAgent,
      `req_${Date.now()}`
    );

    this.auditor.logEvent(session.id, userId, 'session_created', ipAddress);

    return { session, context };
  }

  registerAndTrustDevice(
    userId: string,
    sessionId: string,
    type: DeviceInfo['type'],
    os: string,
    osVersion: string,
    browser: string,
    browserVersion: string
  ): DeviceInfo {
    const device = this.deviceTracker.registerDevice(
      userId,
      type,
      os,
      osVersion,
      browser,
      browserVersion
    );
    this.sessionManager.setDeviceInfo(sessionId, device.deviceId);
    this.deviceTracker.trustDevice(device.deviceId);
    this.auditor.logEvent(sessionId, userId, 'device_detected', '', device.deviceId);

    return device;
  }

  recordLocationWithAnomalyDetection(
    sessionId: string,
    userId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
    country: string,
    city: string,
    region: string,
    timezone: string
  ): LocationInfo {
    const isAnomaly = this.locationTracker.detectAnomalies(sessionId, latitude, longitude);

    const location = this.locationTracker.recordLocation(
      sessionId,
      userId,
      latitude,
      longitude,
      accuracy,
      country,
      city,
      region,
      timezone
    );

    location.isAnomaly = isAnomaly;

    this.sessionManager.setLocation(sessionId, latitude, longitude, country, city);
    this.auditor.logEvent(sessionId, userId, 'location_updated', '', undefined, {
      isAnomaly,
      country,
      city,
    });

    return location;
  }

  getSessionStatus(sessionId: string): {
    session: SessionMetadata | undefined;
    context: UserContext | undefined;
    device: DeviceInfo | undefined;
    lastLocation: LocationInfo | undefined;
    events: SessionContextEvent[];
  } {
    const session = this.sessionManager.getSession(sessionId);
    const context = session ? this.contextManager.getContext(sessionId) : undefined;
    const device =
      session && session.deviceId ? this.deviceTracker.getDevice(session.deviceId) : undefined;
    const lastLocation = this.locationTracker.getLastLocation(sessionId);
    const events = this.auditor.getSessionEvents(sessionId);

    return { session, context, device, lastLocation, events };
  }

  async clear(): Promise<void> {
    await this.sessionManager.clear();
    await this.contextManager.clear();
    await this.deviceTracker.clear();
    await this.locationTracker.clear();
    await this.auditor.clear();
  }
}
