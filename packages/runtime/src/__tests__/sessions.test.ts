import {
  SessionManager,
  ContextManager,
  DeviceTracker,
  LocationTracker,
  SessionAuditor,
  SessionHub,
  SessionMetadata,
  UserContext,
  DeviceInfo,
} from '../sessions';

describe('Advanced Session Management & Context Tracking', () => {
  describe('SessionManager', () => {
    let sessionManager: SessionManager;

    beforeEach(() => {
      sessionManager = new SessionManager();
    });

    afterEach(async () => {
      await sessionManager.clear();
    });

    it('should create session', () => {
      const session = sessionManager.createSession(
        'user1',
        'token_hash_1',
        '192.168.1.1',
        'Mozilla/5.0',
        3600000,
      );

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user1');
      expect(session.status).toBe('active');
      expect(session.ipAddress).toBe('192.168.1.1');
    });

    it('should retrieve active session', () => {
      const created = sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0');
      const retrieved = sessionManager.getSession(created.id);

      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.status).toBe('active');
    });

    it('should return undefined for expired session', () => {
      const session = sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0', -1000);

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBeUndefined();
    });

    it('should get session by token hash', () => {
      const session = sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0');
      const retrieved = sessionManager.getSessionByToken('token_hash_1');

      expect(retrieved?.id).toBe(session.id);
    });

    it('should get user sessions', () => {
      sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0');
      sessionManager.createSession('user1', 'token_hash_2', '192.168.1.2', 'Mozilla/5.0');
      sessionManager.createSession('user2', 'token_hash_3', '192.168.1.3', 'Mozilla/5.0');

      const user1Sessions = sessionManager.getUserSessions('user1');
      expect(user1Sessions.length).toBe(2);
      expect(user1Sessions.every((s) => s.userId === 'user1')).toBe(true);
    });

    it('should refresh session', () => {
      const created = sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0', 3600000);
      const originalExpiry = created.expiresAt;

      const refreshed = sessionManager.refreshSession(created.id, 7200000);

      expect(refreshed?.expiresAt).toBeGreaterThan(originalExpiry);
    });

    it('should invalidate session', () => {
      const session = sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0');
      const invalidated = sessionManager.invalidateSession(session.id);

      expect(invalidated).toBe(true);
      expect(sessionManager.getSession(session.id)).toBeUndefined();
    });

    it('should invalidate all user sessions', () => {
      const s1 = sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0');
      const s2 = sessionManager.createSession('user1', 'token_hash_2', '192.168.1.2', 'Mozilla/5.0');

      const count = sessionManager.invalidateUserSessions('user1');

      expect(count).toBe(2);
      expect(sessionManager.getSession(s1.id)).toBeUndefined();
      expect(sessionManager.getSession(s2.id)).toBeUndefined();
    });

    it('should expire sessions', () => {
      sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0', -1000);
      sessionManager.createSession('user2', 'token_hash_2', '192.168.1.2', 'Mozilla/5.0', 3600000);

      const expired = sessionManager.expireSessions();

      expect(expired).toBeGreaterThan(0);
    });

    it('should set device info', () => {
      const session = sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0');
      const set = sessionManager.setDeviceInfo(session.id, 'device_123');

      expect(set).toBe(true);
      expect(sessionManager.getSession(session.id)?.deviceId).toBe('device_123');
    });

    it('should set location', () => {
      const session = sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0');
      const set = sessionManager.setLocation(session.id, 40.7128, -74.006, 'US', 'New York');

      expect(set).toBe(true);
      expect(sessionManager.getSession(session.id)?.latitude).toBe(40.7128);
      expect(sessionManager.getSession(session.id)?.city).toBe('New York');
    });

    it('should get active sessions', () => {
      sessionManager.createSession('user1', 'token_hash_1', '192.168.1.1', 'Mozilla/5.0', 3600000);
      sessionManager.createSession('user2', 'token_hash_2', '192.168.1.2', 'Mozilla/5.0', -1000);

      const active = sessionManager.getActiveSessions();

      expect(active.length).toBeGreaterThanOrEqual(1);
      expect(active.every((s) => s.status === 'active')).toBe(true);
    });
  });

  describe('ContextManager', () => {
    let contextManager: ContextManager;

    beforeEach(() => {
      contextManager = new ContextManager();
    });

    afterEach(async () => {
      await contextManager.clear();
    });

    it('should establish context', () => {
      const context = contextManager.establishContext(
        'user1',
        'session1',
        '192.168.1.1',
        'Mozilla/5.0',
        'req_123',
      );

      expect(context.userId).toBe('user1');
      expect(context.sessionId).toBe('session1');
      expect(context.correlationId).toBeDefined();
    });

    it('should retrieve context', () => {
      const established = contextManager.establishContext(
        'user1',
        'session1',
        '192.168.1.1',
        'Mozilla/5.0',
        'req_123',
      );

      const retrieved = contextManager.getContext(established.correlationId);

      expect(retrieved?.userId).toBe('user1');
    });

    it('should get context by request ID', () => {
      const established = contextManager.establishContext(
        'user1',
        'session1',
        '192.168.1.1',
        'Mozilla/5.0',
        'req_123',
      );

      const retrieved = contextManager.getContextByRequest('req_123');

      expect(retrieved?.correlationId).toBe(established.correlationId);
    });

    it('should update context', () => {
      const established = contextManager.establishContext(
        'user1',
        'session1',
        '192.168.1.1',
        'Mozilla/5.0',
        'req_123',
      );

      const updated = contextManager.updateContext(established.correlationId, {
        metadata: { customKey: 'customValue' },
      });

      expect(updated?.metadata?.customKey).toBe('customValue');
    });

    it('should add permissions', () => {
      const context = contextManager.establishContext(
        'user1',
        'session1',
        '192.168.1.1',
        'Mozilla/5.0',
        'req_123',
      );

      const added = contextManager.addPermissions(context.correlationId, ['read', 'write']);

      expect(added).toBe(true);
      expect(contextManager.getContext(context.correlationId)?.permissions).toContain('read');
    });

    it('should add roles', () => {
      const context = contextManager.establishContext(
        'user1',
        'session1',
        '192.168.1.1',
        'Mozilla/5.0',
        'req_123',
      );

      const added = contextManager.addRoles(context.correlationId, ['admin', 'user']);

      expect(added).toBe(true);
      expect(contextManager.getContext(context.correlationId)?.roles).toContain('admin');
    });

    it('should list contexts', () => {
      contextManager.establishContext('user1', 'session1', '192.168.1.1', 'Mozilla/5.0', 'req_1');
      contextManager.establishContext('user2', 'session2', '192.168.1.2', 'Mozilla/5.0', 'req_2');

      const contexts = contextManager.listContexts();

      expect(contexts.length).toBe(2);
    });
  });

  describe('DeviceTracker', () => {
    let deviceTracker: DeviceTracker;

    beforeEach(() => {
      deviceTracker = new DeviceTracker();
    });

    afterEach(async () => {
      await deviceTracker.clear();
    });

    it('should register device', () => {
      const device = deviceTracker.registerDevice(
        'user1',
        'mobile',
        'iOS',
        '16.0',
        'Safari',
        '16.0',
      );

      expect(device.deviceId).toBeDefined();
      expect(device.type).toBe('mobile');
      expect(device.userId).toBe('user1');
    });

    it('should get device', () => {
      const registered = deviceTracker.registerDevice('user1', 'desktop', 'macOS', '13.0', 'Chrome', '120.0');
      const retrieved = deviceTracker.getDevice(registered.deviceId);

      expect(retrieved?.userId).toBe('user1');
      expect(retrieved?.type).toBe('desktop');
    });

    it('should get user devices', () => {
      deviceTracker.registerDevice('user1', 'mobile', 'iOS', '16.0', 'Safari', '16.0');
      deviceTracker.registerDevice('user1', 'desktop', 'macOS', '13.0', 'Chrome', '120.0');

      const devices = deviceTracker.getUserDevices('user1');

      expect(devices.length).toBe(2);
      expect(devices.every((d) => d.userId === 'user1')).toBe(true);
    });

    it('should update last seen', () => {
      const device = deviceTracker.registerDevice('user1', 'mobile', 'iOS', '16.0', 'Safari', '16.0');
      const originalLastSeen = device.lastSeenAt;

      setTimeout(() => {}, 1);

      const updated = deviceTracker.updateLastSeen(device.deviceId);

      expect(updated).toBe(true);
      expect(deviceTracker.getDevice(device.deviceId)?.lastSeenAt).toBeGreaterThanOrEqual(originalLastSeen);
    });

    it('should trust device', () => {
      const device = deviceTracker.registerDevice('user1', 'mobile', 'iOS', '16.0', 'Safari', '16.0');

      const trusted = deviceTracker.trustDevice(device.deviceId);

      expect(trusted).toBe(true);
      expect(deviceTracker.isTrusted(device.deviceId)).toBe(true);
    });

    it('should remove device', () => {
      const device = deviceTracker.registerDevice('user1', 'mobile', 'iOS', '16.0', 'Safari', '16.0');

      const removed = deviceTracker.removeDevice(device.deviceId);

      expect(removed).toBe(true);
      expect(deviceTracker.getDevice(device.deviceId)).toBeUndefined();
    });
  });

  describe('LocationTracker', () => {
    let locationTracker: LocationTracker;

    beforeEach(() => {
      locationTracker = new LocationTracker();
    });

    afterEach(async () => {
      await locationTracker.clear();
    });

    it('should record location', () => {
      const location = locationTracker.recordLocation(
        'session1',
        'user1',
        40.7128,
        -74.006,
        10,
        'US',
        'New York',
        'NY',
        'UTC-5',
      );

      expect(location.city).toBe('New York');
      expect(location.latitude).toBe(40.7128);
    });

    it('should get last location', () => {
      locationTracker.recordLocation('session1', 'user1', 40.7128, -74.006, 10, 'US', 'New York', 'NY', 'UTC-5');

      const last = locationTracker.getLastLocation('session1');

      expect(last?.city).toBe('New York');
    });

    it('should get session locations', () => {
      locationTracker.recordLocation('session1', 'user1', 40.7128, -74.006, 10, 'US', 'New York', 'NY', 'UTC-5');
      locationTracker.recordLocation('session1', 'user1', 34.0522, -118.2437, 10, 'US', 'Los Angeles', 'CA', 'UTC-8');

      const locations = locationTracker.getSessionLocations('session1');

      expect(locations.length).toBe(2);
    });

    it('should detect location anomalies', () => {
      locationTracker.recordLocation('session1', 'user1', 40.7128, -74.006, 10, 'US', 'New York', 'NY', 'UTC-5');

      const isAnomaly = locationTracker.detectAnomalies('session1', 34.0522, -118.2437);

      expect(isAnomaly).toBe(true);
    });

    it('should detect anomalies for instant travel', () => {
      locationTracker.recordLocation('session1', 'user1', 40.7128, -74.006, 10, 'US', 'New York', 'NY', 'UTC-5');

      const isAnomaly = locationTracker.detectAnomalies('session1', 40.7580, -73.9855);

      expect(isAnomaly).toBe(true);
    });

    it('should not detect anomalies for realistic travel', () => {
      const location = locationTracker.recordLocation(
        'session1',
        'user1',
        40.7128,
        -74.006,
        10,
        'US',
        'New York',
        'NY',
        'UTC-5',
      );

      location.timestamp = Date.now() - 3600000;

      const isAnomaly = locationTracker.detectAnomalies('session1', 40.7128, -74.006);

      expect(isAnomaly).toBe(false);
    });
  });

  describe('SessionAuditor', () => {
    let auditor: SessionAuditor;

    beforeEach(() => {
      auditor = new SessionAuditor();
    });

    afterEach(async () => {
      await auditor.clear();
    });

    it('should log event', () => {
      const event = auditor.logEvent(
        'session1',
        'user1',
        'session_created',
        '192.168.1.1',
        'device1',
        { source: 'web' },
      );

      expect(event.eventType).toBe('session_created');
      expect(event.userId).toBe('user1');
    });

    it('should get session events', () => {
      auditor.logEvent('session1', 'user1', 'session_created', '192.168.1.1');
      auditor.logEvent('session1', 'user1', 'device_detected', '192.168.1.1');

      const events = auditor.getSessionEvents('session1');

      expect(events.length).toBe(2);
      expect(events.every((e) => e.sessionId === 'session1')).toBe(true);
    });

    it('should get user events', () => {
      auditor.logEvent('session1', 'user1', 'session_created', '192.168.1.1');
      auditor.logEvent('session2', 'user1', 'session_created', '192.168.1.2');

      const events = auditor.getUserEvents('user1');

      expect(events.length).toBe(2);
      expect(events.every((e) => e.userId === 'user1')).toBe(true);
    });

    it('should get events by type', () => {
      auditor.logEvent('session1', 'user1', 'session_created', '192.168.1.1');
      auditor.logEvent('session1', 'user1', 'device_detected', '192.168.1.1');
      auditor.logEvent('session2', 'user2', 'session_created', '192.168.1.2');

      const created = auditor.getEventsByType('session_created');

      expect(created.length).toBe(2);
      expect(created.every((e) => e.eventType === 'session_created')).toBe(true);
    });

    it('should get all events with limit', () => {
      for (let i = 0; i < 10; i++) {
        auditor.logEvent(`session${i}`, `user${i}`, 'session_created', '192.168.1.1');
      }

      const events = auditor.getEvents(5);

      expect(events.length).toBe(5);
    });
  });

  describe('SessionHub', () => {
    let hub: SessionHub;

    beforeEach(() => {
      hub = new SessionHub();
    });

    afterEach(async () => {
      await hub.clear();
    });

    it('should provide session manager', () => {
      const manager = hub.getSessionManager();
      expect(manager).toBeDefined();
    });

    it('should provide context manager', () => {
      const manager = hub.getContextManager();
      expect(manager).toBeDefined();
    });

    it('should provide device tracker', () => {
      const tracker = hub.getDeviceTracker();
      expect(tracker).toBeDefined();
    });

    it('should provide location tracker', () => {
      const tracker = hub.getLocationTracker();
      expect(tracker).toBeDefined();
    });

    it('should provide auditor', () => {
      const auditor = hub.getAuditor();
      expect(auditor).toBeDefined();
    });

    it('should create session with context', () => {
      const { session, context } = hub.createSessionWithContext(
        'user1',
        'token_hash_1',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(session.id).toBeDefined();
      expect(context.sessionId).toBe(session.id);
    });

    it('should register and trust device', () => {
      const { session } = hub.createSessionWithContext(
        'user1',
        'token_hash_1',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      const device = hub.registerAndTrustDevice(
        'user1',
        session.id,
        'mobile',
        'iOS',
        '16.0',
        'Safari',
        '16.0',
      );

      expect(hub.getDeviceTracker().isTrusted(device.deviceId)).toBe(true);
    });

    it('should record location with anomaly detection', () => {
      const { session } = hub.createSessionWithContext(
        'user1',
        'token_hash_1',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      const location = hub.recordLocationWithAnomalyDetection(
        session.id,
        'user1',
        40.7128,
        -74.006,
        10,
        'US',
        'New York',
        'NY',
        'UTC-5',
      );

      expect(location.city).toBe('New York');
    });

    it('should get complete session status', () => {
      const { session, context } = hub.createSessionWithContext(
        'user1',
        'token_hash_1',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      const device = hub.registerAndTrustDevice(
        'user1',
        session.id,
        'mobile',
        'iOS',
        '16.0',
        'Safari',
        '16.0',
      );

      hub.recordLocationWithAnomalyDetection(session.id, 'user1', 40.7128, -74.006, 10, 'US', 'New York', 'NY', 'UTC-5');

      const status = hub.getSessionStatus(session.id);

      expect(status.session?.id).toBe(session.id);
      expect(status.device?.deviceId).toBe(device.deviceId);
      expect(status.lastLocation?.city).toBe('New York');
      expect(status.events.length).toBeGreaterThan(0);
    });

    it('should integrate all components', () => {
      const { session } = hub.createSessionWithContext(
        'user1',
        'token_hash_1',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      hub.getContextManager().addPermissions(session.id, ['read', 'write']);
      hub.registerAndTrustDevice('user1', session.id, 'desktop', 'macOS', '13.0', 'Chrome', '120.0');

      const userSessions = hub.getSessionManager().getUserSessions('user1');

      expect(userSessions.length).toBeGreaterThan(0);
      expect(hub.getAuditor().getSessionEvents(session.id).length).toBeGreaterThan(0);
    });
  });
});
