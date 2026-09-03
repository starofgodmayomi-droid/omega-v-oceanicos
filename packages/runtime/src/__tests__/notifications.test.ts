import {
  NotificationTemplateManager,
  RecipientManager,
  NotificationQueue,
  NotificationDispatcher,
  NotificationAuditor,
  NotificationHub,
  NotificationRecipient,
  NotificationPayload,
  NotificationChannel,
} from '../notifications';

describe('Advanced Notification & Broadcasting System', () => {
  describe('NotificationTemplateManager', () => {
    let templateManager: NotificationTemplateManager;

    beforeEach(() => {
      templateManager = new NotificationTemplateManager();
    });

    afterEach(async () => {
      await templateManager.clear();
    });

    it('should register email template', () => {
      const template = templateManager.registerTemplate(
        'welcome',
        'Welcome Email',
        'email',
        'Welcome {{name}}!',
        'Welcome',
        ['name']
      );

      expect(template.id).toBe('welcome');
      expect(template.name).toBe('Welcome Email');
      expect(template.channel).toBe('email');
      expect(template.variables).toContain('name');
    });

    it('should register SMS template', () => {
      const template = templateManager.registerTemplate(
        'sms-verify',
        'SMS Verification',
        'sms',
        'Your code: {{code}}',
        undefined,
        ['code']
      );

      expect(template.channel).toBe('sms');
      expect(template.subject).toBeUndefined();
    });

    it('should render template with variables', () => {
      templateManager.registerTemplate(
        'greeting',
        'Greeting',
        'email',
        'Hello {{firstName}} {{lastName}}',
        'Greetings {{firstName}}',
        ['firstName', 'lastName']
      );

      const rendered = templateManager.renderTemplate('greeting', {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(rendered.body).toBe('Hello John Doe');
      expect(rendered.subject).toBe('Greetings John');
    });

    it('should handle multiple variable occurrences', () => {
      templateManager.registerTemplate(
        'repeat',
        'Repeat',
        'email',
        '{{value}} and {{value}} again',
        '',
        ['value']
      );

      const rendered = templateManager.renderTemplate('repeat', { value: 'test' });
      expect(rendered.body).toBe('test and test again');
    });

    it('should list templates', () => {
      templateManager.registerTemplate('t1', 'Template 1', 'email', 'Body 1');
      templateManager.registerTemplate('t2', 'Template 2', 'sms', 'Body 2');
      templateManager.registerTemplate('t3', 'Template 3', 'email', 'Body 3');

      const templates = templateManager.listTemplates();
      expect(templates.length).toBe(3);
    });

    it('should filter templates by channel', () => {
      templateManager.registerTemplate('t1', 'Template 1', 'email', 'Body 1');
      templateManager.registerTemplate('t2', 'Template 2', 'sms', 'Body 2');
      templateManager.registerTemplate('t3', 'Template 3', 'email', 'Body 3');

      const emailTemplates = templateManager.listTemplates('email');
      expect(emailTemplates.length).toBe(2);
      expect(emailTemplates.every((t) => t.channel === 'email')).toBe(true);
    });

    it('should throw on unknown template', () => {
      expect(() => templateManager.renderTemplate('unknown', {})).toThrow();
    });

    it('should delete template', () => {
      templateManager.registerTemplate('t1', 'Template 1', 'email', 'Body 1');
      const deleted = templateManager.deleteTemplate('t1');

      expect(deleted).toBe(true);
      expect(templateManager.listTemplates().length).toBe(0);
    });
  });

  describe('RecipientManager', () => {
    let recipientManager: RecipientManager;

    beforeEach(() => {
      recipientManager = new RecipientManager();
    });

    afterEach(async () => {
      await recipientManager.clear();
    });

    it('should register recipient', () => {
      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      const registered = recipientManager.registerRecipient(recipient);
      expect(registered.id).toBe('user1');
      expect(registered.address).toBe('user@example.com');
    });

    it('should retrieve recipient', () => {
      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      recipientManager.registerRecipient(recipient);
      const retrieved = recipientManager.getRecipient('user1');

      expect(retrieved?.id).toBe('user1');
      expect(retrieved?.address).toBe('user@example.com');
    });

    it('should find recipients by address', () => {
      const recipient1: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'shared@example.com',
      };

      const recipient2: NotificationRecipient = {
        id: 'user2',
        type: 'email',
        address: 'shared@example.com',
      };

      recipientManager.registerRecipient(recipient1);
      recipientManager.registerRecipient(recipient2);

      const found = recipientManager.findByAddress('shared@example.com');
      expect(found.length).toBe(2);
    });

    it('should update preferences', () => {
      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      recipientManager.registerRecipient(recipient);
      recipientManager.updatePreferences('user1', {
        channels: ['email', 'sms'],
      });

      const updated = recipientManager.getRecipient('user1');
      expect(updated?.preferences?.channels).toContain('email');
    });

    it('should verify recipient', () => {
      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      recipientManager.registerRecipient(recipient);
      const verified = recipientManager.verifyRecipient('user1');

      expect(verified).toBe(true);
      expect(recipientManager.getRecipient('user1')?.verified).toBe(true);
    });

    it('should unsubscribe from notification type', () => {
      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      recipientManager.registerRecipient(recipient);
      const unsubscribed = recipientManager.unsubscribeFromType('user1', 'marketing');

      expect(unsubscribed).toBe(true);
      expect(recipientManager.getRecipient('user1')?.preferences?.unsubscribe_types).toContain(
        'marketing'
      );
    });

    it('should list recipients', () => {
      recipientManager.registerRecipient({
        id: 'user1',
        type: 'email',
        address: 'user1@example.com',
      });
      recipientManager.registerRecipient({
        id: 'user2',
        type: 'email',
        address: 'user2@example.com',
      });

      const recipients = recipientManager.listRecipients();
      expect(recipients.length).toBe(2);
    });

    it('should delete recipient', () => {
      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      recipientManager.registerRecipient(recipient);
      const deleted = recipientManager.deleteRecipient('user1');

      expect(deleted).toBe(true);
      expect(recipientManager.getRecipient('user1')).toBeUndefined();
    });
  });

  describe('NotificationQueue', () => {
    let queue: NotificationQueue;

    beforeEach(() => {
      queue = new NotificationQueue();
    });

    afterEach(async () => {
      await queue.clear();
    });

    it('should enqueue notification', () => {
      const payload: NotificationPayload = {
        id: 'notif1',
        templateId: 'welcome',
        recipients: [],
        variables: {},
        channels: ['email'],
        priority: 'normal',
        createdAt: Date.now(),
      };

      const enqueued = queue.enqueue(payload);
      expect(enqueued.id).toBe('notif1');
    });

    it('should dequeue notification', () => {
      const payload: NotificationPayload = {
        id: 'notif1',
        templateId: 'welcome',
        recipients: [],
        variables: {},
        channels: ['email'],
        priority: 'normal',
        createdAt: Date.now(),
      };

      queue.enqueue(payload);
      const dequeued = queue.dequeue('notif1');

      expect(dequeued?.id).toBe('notif1');
    });

    it('should get ready notifications', () => {
      const now = Date.now();
      const payload1: NotificationPayload = {
        id: 'notif1',
        templateId: 'welcome',
        recipients: [],
        variables: {},
        channels: ['email'],
        priority: 'normal',
        scheduledFor: now - 1000,
        createdAt: Date.now(),
      };

      const payload2: NotificationPayload = {
        id: 'notif2',
        templateId: 'welcome',
        recipients: [],
        variables: {},
        channels: ['email'],
        priority: 'normal',
        scheduledFor: now + 10000,
        createdAt: Date.now(),
      };

      queue.enqueue(payload1);
      queue.enqueue(payload2);

      const ready = queue.getReadyNotifications();
      expect(ready.length).toBe(1);
      expect(ready[0].id).toBe('notif1');
    });

    it('should record delivery', () => {
      const payload: NotificationPayload = {
        id: 'notif1',
        templateId: 'welcome',
        recipients: [],
        variables: {},
        channels: ['email'],
        priority: 'normal',
        createdAt: Date.now(),
      };

      queue.enqueue(payload);
      queue.recordDelivery({
        id: 'delivery1',
        notificationId: 'notif1',
        recipientId: 'user1',
        channel: 'email',
        status: 'delivered',
        sentAt: Date.now(),
        deliveredAt: Date.now(),
        retryCount: 0,
      });

      const deliveries = queue.getDeliveries('notif1');
      expect(deliveries.length).toBe(1);
      expect(deliveries[0].status).toBe('delivered');
    });

    it('should get delivery status summary', () => {
      const payload: NotificationPayload = {
        id: 'notif1',
        templateId: 'welcome',
        recipients: [],
        variables: {},
        channels: ['email'],
        priority: 'normal',
        createdAt: Date.now(),
      };

      queue.enqueue(payload);
      queue.recordDelivery({
        id: 'delivery1',
        notificationId: 'notif1',
        recipientId: 'user1',
        channel: 'email',
        status: 'delivered',
        retryCount: 0,
      });
      queue.recordDelivery({
        id: 'delivery2',
        notificationId: 'notif1',
        recipientId: 'user2',
        channel: 'sms',
        status: 'failed',
        retryCount: 1,
      });

      const status = queue.getDeliveryStatus('notif1');
      expect(status.delivered).toBe(1);
      expect(status.failed).toBe(1);
    });

    it('should list pending notifications', () => {
      const payload1: NotificationPayload = {
        id: 'notif1',
        templateId: 'welcome',
        recipients: [],
        variables: {},
        channels: ['email'],
        priority: 'normal',
        createdAt: Date.now(),
      };

      const payload2: NotificationPayload = {
        id: 'notif2',
        templateId: 'alert',
        recipients: [],
        variables: {},
        channels: ['sms'],
        priority: 'critical',
        createdAt: Date.now(),
      };

      queue.enqueue(payload1);
      queue.enqueue(payload2);

      const pending = queue.listPending();
      expect(pending.length).toBe(2);
    });

    it('should remove notification from queue', () => {
      const payload: NotificationPayload = {
        id: 'notif1',
        templateId: 'welcome',
        recipients: [],
        variables: {},
        channels: ['email'],
        priority: 'normal',
        createdAt: Date.now(),
      };

      queue.enqueue(payload);
      const removed = queue.remove('notif1');

      expect(removed).toBe(true);
      expect(queue.dequeue('notif1')).toBeUndefined();
    });
  });

  describe('NotificationDispatcher', () => {
    let dispatcher: NotificationDispatcher;

    beforeEach(() => {
      dispatcher = new NotificationDispatcher();
    });

    afterEach(async () => {
      await dispatcher.clear();
    });

    it('should register handler', async () => {
      dispatcher.registerHandler('email', async () => true);

      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      const result = await dispatcher.dispatch('email', recipient, { body: 'Test' });
      expect(result).toBe(true);
    });

    it('should dispatch to multiple channels', async () => {
      dispatcher.registerHandler('email', async () => true);
      dispatcher.registerHandler('sms', async () => true);

      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      const results = await dispatcher.dispatchAll(['email', 'sms'], recipient, { body: 'Test' });

      expect(results.get('email')).toBe(true);
      expect(results.get('sms')).toBe(true);
    });

    it('should handle dispatch failure', async () => {
      dispatcher.registerHandler('email', async () => false);

      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      const result = await dispatcher.dispatch('email', recipient, { body: 'Test' });
      expect(result).toBe(false);
    });

    it('should throw on unregistered channel', async () => {
      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      await expect(dispatcher.dispatch('webhook', recipient, { body: 'Test' })).rejects.toThrow();
    });
  });

  describe('NotificationAuditor', () => {
    let auditor: NotificationAuditor;

    beforeEach(() => {
      auditor = new NotificationAuditor();
    });

    afterEach(async () => {
      await auditor.clear();
    });

    it('should log notification creation', () => {
      const log = auditor.logAction('notif1', 'created', 'system', { recipientCount: 5 });

      expect(log.notificationId).toBe('notif1');
      expect(log.action).toBe('created');
      expect(log.actor).toBe('system');
      expect(log.details?.recipientCount).toBe(5);
    });

    it('should get notification history', () => {
      auditor.logAction('notif1', 'created', 'system');
      auditor.logAction('notif1', 'sent', 'system');
      auditor.logAction('notif1', 'delivered', 'system');

      const history = auditor.getNotificationHistory('notif1');
      expect(history.length).toBe(3);
      expect(history[0].action).toBe('created');
    });

    it('should filter logs by action', () => {
      auditor.logAction('notif1', 'created', 'system');
      auditor.logAction('notif2', 'created', 'system');
      auditor.logAction('notif3', 'sent', 'system');

      const createdLogs = auditor.getActionLogs('created');
      expect(createdLogs.length).toBe(2);
      expect(createdLogs.every((l) => l.action === 'created')).toBe(true);
    });

    it('should get logs with limit', () => {
      for (let i = 0; i < 10; i++) {
        auditor.logAction(`notif${i}`, 'created', 'system');
      }

      const logs = auditor.getLogs(5);
      expect(logs.length).toBe(5);
    });
  });

  describe('NotificationHub', () => {
    let hub: NotificationHub;

    beforeEach(() => {
      hub = new NotificationHub();
    });

    afterEach(async () => {
      await hub.clear();
    });

    it('should provide template manager', () => {
      const manager = hub.getTemplateManager();
      expect(manager).toBeDefined();
    });

    it('should provide recipient manager', () => {
      const manager = hub.getRecipientManager();
      expect(manager).toBeDefined();
    });

    it('should provide queue', () => {
      const queue = hub.getQueue();
      expect(queue).toBeDefined();
    });

    it('should provide dispatcher', () => {
      const dispatcher = hub.getDispatcher();
      expect(dispatcher).toBeDefined();
    });

    it('should provide auditor', () => {
      const auditor = hub.getAuditor();
      expect(auditor).toBeDefined();
    });

    it('should send notification', async () => {
      hub
        .getTemplateManager()
        .registerTemplate('welcome', 'Welcome', 'email', 'Welcome {{name}}!', 'Welcome', ['name']);

      hub.getDispatcher().registerHandler('email', async () => true);

      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
        preferences: { channels: ['email'] },
      };

      const payload = await hub.sendNotification(
        'welcome',
        [recipient],
        { name: 'John' },
        ['email'],
        'normal',
        'test'
      );

      expect(payload.id).toBeDefined();
      expect(payload.recipients.length).toBe(1);
    });

    it('should schedule notification', async () => {
      hub
        .getTemplateManager()
        .registerTemplate('scheduled', 'Scheduled', 'email', 'Message', '', []);

      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
      };

      const scheduledFor = Date.now() + 10000;
      const payload = await hub.scheduleNotification(
        'scheduled',
        [recipient],
        {},
        ['email'],
        scheduledFor,
        'normal',
        'test'
      );

      expect(payload.scheduledFor).toBe(scheduledFor);
    });

    it('should get notification status', async () => {
      hub.getTemplateManager().registerTemplate('test', 'Test', 'email', 'Body', '', []);
      hub.getDispatcher().registerHandler('email', async () => true);

      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
        preferences: { channels: ['email'] },
      };

      await hub.sendNotification('test', [recipient], {}, ['email'], 'normal', 'test');
      const queued = hub.getQueue().listPending();
      const notificationId = queued[0].id;

      const status = hub.getNotificationStatus(notificationId);

      expect(status.notification).toBeDefined();
      expect(status.deliveryStatus).toBeDefined();
      expect(status.history.length).toBeGreaterThan(0);
    });

    it('should respect recipient unsubscription', async () => {
      hub.getTemplateManager().registerTemplate('promo', 'Promo', 'email', 'Promotion', '', []);
      hub.getDispatcher().registerHandler('email', async () => true);

      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
        preferences: {
          channels: ['email'],
          unsubscribe_types: ['promo'],
        },
      };

      const payload = await hub.sendNotification(
        'promo',
        [recipient],
        {},
        ['email'],
        'normal',
        'test'
      );

      const deliveries = hub.getQueue().getDeliveries(payload.id);
      expect(deliveries.length).toBe(0);
    });

    it('should integrate all components', async () => {
      hub
        .getTemplateManager()
        .registerTemplate('alert', 'Alert', 'email', 'Alert: {{message}}', 'ALERT', ['message']);
      hub.getDispatcher().registerHandler('email', async () => true);

      const recipient: NotificationRecipient = {
        id: 'user1',
        type: 'email',
        address: 'user@example.com',
        verified: true,
        preferences: { channels: ['email'] },
      };

      hub.getRecipientManager().registerRecipient(recipient);

      const payload = await hub.sendNotification(
        'alert',
        [recipient],
        { message: 'Critical issue' },
        ['email'],
        'critical',
        'system'
      );

      const status = hub.getNotificationStatus(payload.id);

      expect(status.notification?.priority).toBe('critical');
      expect(status.deliveryStatus.delivered).toBeGreaterThan(0);
      expect(status.history.length).toBeGreaterThan(0);
    });
  });
});
