/**
 * Advanced Notification & Broadcasting System
 * Enterprise-grade notifications with multi-channel delivery, templating, scheduling, and tracking
 */

export type NotificationChannel = 'email' | 'sms' | 'slack' | 'webhook' | 'in-app';
export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  variables: string[];
  createdAt: number;
}

export interface NotificationRecipient {
  id: string;
  type: 'email' | 'phone' | 'slack' | 'webhook' | 'user';
  address: string;
  verified?: boolean;
  preferences?: {
    channels?: NotificationChannel[];
    quiet_hours?: { start: string; end: string };
    unsubscribe_types?: string[];
  };
}

export interface NotificationPayload {
  id: string;
  templateId: string;
  recipients: NotificationRecipient[];
  variables: Record<string, any>;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  scheduledFor?: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
  createdAt: number;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  recipientId: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  sentAt?: number;
  deliveredAt?: number;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: number;
}

export interface NotificationAuditLog {
  id: string;
  notificationId: string;
  action: 'created' | 'sent' | 'delivered' | 'failed' | 'retried' | 'cancelled';
  actor: string;
  timestamp: number;
  details?: Record<string, any>;
}

/**
 * NotificationTemplate Manager: Template registration and interpolation
 */
export class NotificationTemplateManager {
  private templates: Map<string, NotificationTemplate> = new Map();

  registerTemplate(
    id: string,
    name: string,
    channel: NotificationChannel,
    body: string,
    subject?: string,
    variables: string[] = [],
  ): NotificationTemplate {
    const template: NotificationTemplate = {
      id,
      name,
      channel,
      subject,
      body,
      variables,
      createdAt: Date.now(),
    };

    this.templates.set(id, template);
    return template;
  }

  getTemplate(id: string): NotificationTemplate | undefined {
    return this.templates.get(id);
  }

  renderTemplate(
    templateId: string,
    variables: Record<string, any>,
  ): { subject?: string; body: string } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let body = template.body;
    let subject = template.subject || '';

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { subject, body };
  }

  listTemplates(channel?: NotificationChannel): NotificationTemplate[] {
    const templates = Array.from(this.templates.values());
    return channel ? templates.filter((t) => t.channel === channel) : templates;
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  async clear(): Promise<void> {
    this.templates.clear();
  }
}

/**
 * RecipientManager: Recipient registry and preferences
 */
export class RecipientManager {
  private recipients: Map<string, NotificationRecipient> = new Map();
  private addressIndex: Map<string, Set<string>> = new Map();

  registerRecipient(recipient: NotificationRecipient): NotificationRecipient {
    this.recipients.set(recipient.id, recipient);
    this.indexAddress(recipient.address, recipient.id);
    return recipient;
  }

  private indexAddress(address: string, recipientId: string): void {
    if (!this.addressIndex.has(address)) {
      this.addressIndex.set(address, new Set());
    }
    this.addressIndex.get(address)!.add(recipientId);
  }

  getRecipient(id: string): NotificationRecipient | undefined {
    return this.recipients.get(id);
  }

  findByAddress(address: string): NotificationRecipient[] {
    const recipientIds = this.addressIndex.get(address) || new Set();
    return Array.from(recipientIds).map((id) => this.recipients.get(id)!).filter(Boolean);
  }

  updatePreferences(
    recipientId: string,
    preferences: Partial<NotificationRecipient['preferences']>,
  ): NotificationRecipient | undefined {
    const recipient = this.recipients.get(recipientId);
    if (!recipient) return undefined;

    recipient.preferences = {
      ...(recipient.preferences || {}),
      ...preferences,
    };

    return recipient;
  }

  verifyRecipient(recipientId: string): boolean {
    const recipient = this.recipients.get(recipientId);
    if (!recipient) return false;

    recipient.verified = true;
    return true;
  }

  unsubscribeFromType(recipientId: string, notificationType: string): boolean {
    const recipient = this.recipients.get(recipientId);
    if (!recipient) return false;

    if (!recipient.preferences) {
      recipient.preferences = {};
    }

    if (!recipient.preferences.unsubscribe_types) {
      recipient.preferences.unsubscribe_types = [];
    }
    recipient.preferences.unsubscribe_types.push(notificationType);
    return true;
  }

  listRecipients(): NotificationRecipient[] {
    return Array.from(this.recipients.values());
  }

  deleteRecipient(id: string): boolean {
    const recipient = this.recipients.get(id);
    if (!recipient) return false;

    const address = recipient.address;
    if (this.addressIndex.has(address)) {
      this.addressIndex.get(address)!.delete(id);
    }

    return this.recipients.delete(id);
  }

  async clear(): Promise<void> {
    this.recipients.clear();
    this.addressIndex.clear();
  }
}

/**
 * NotificationQueue: Manage pending and scheduled notifications
 */
export class NotificationQueue {
  private queue: Map<string, NotificationPayload> = new Map();
  private scheduled: Map<number, Set<string>> = new Map();
  private deliveries: Map<string, NotificationDelivery[]> = new Map();

  enqueue(payload: NotificationPayload): NotificationPayload {
    this.queue.set(payload.id, payload);

    if (payload.scheduledFor) {
      if (!this.scheduled.has(payload.scheduledFor)) {
        this.scheduled.set(payload.scheduledFor, new Set());
      }
      this.scheduled.get(payload.scheduledFor)!.add(payload.id);
    }

    return payload;
  }

  dequeue(id: string): NotificationPayload | undefined {
    return this.queue.get(id);
  }

  getReadyNotifications(): NotificationPayload[] {
    const now = Date.now();
    const ready: NotificationPayload[] = [];

    for (const [scheduledTime, ids] of this.scheduled.entries()) {
      if (scheduledTime <= now) {
        for (const id of ids) {
          const payload = this.queue.get(id);
          if (payload && (!payload.scheduledFor || payload.scheduledFor <= now)) {
            ready.push(payload);
          }
        }
      }
    }

    return ready;
  }

  recordDelivery(delivery: NotificationDelivery): NotificationDelivery {
    if (!this.deliveries.has(delivery.notificationId)) {
      this.deliveries.set(delivery.notificationId, []);
    }
    this.deliveries.get(delivery.notificationId)!.push(delivery);
    return delivery;
  }

  getDeliveries(notificationId: string): NotificationDelivery[] {
    return this.deliveries.get(notificationId) || [];
  }

  getDeliveryStatus(notificationId: string): Record<string, number> {
    const deliveries = this.getDeliveries(notificationId);
    const status: Record<string, number> = {
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
    };

    for (const delivery of deliveries) {
      status[delivery.status]++;
    }

    return status;
  }

  remove(id: string): boolean {
    const payload = this.queue.get(id);
    if (!payload) return false;

    if (payload.scheduledFor) {
      const ids = this.scheduled.get(payload.scheduledFor);
      if (ids) {
        ids.delete(id);
      }
    }

    return this.queue.delete(id);
  }

  listPending(): NotificationPayload[] {
    return Array.from(this.queue.values());
  }

  async clear(): Promise<void> {
    this.queue.clear();
    this.scheduled.clear();
    this.deliveries.clear();
  }
}

/**
 * NotificationDispatcher: Send notifications to external services
 */
export class NotificationDispatcher {
  private handlers: Map<NotificationChannel, (recipient: NotificationRecipient, content: { subject?: string; body: string }) => Promise<boolean>> = new Map();

  registerHandler(
    channel: NotificationChannel,
    handler: (recipient: NotificationRecipient, content: { subject?: string; body: string }) => Promise<boolean>,
  ): void {
    this.handlers.set(channel, handler);
  }

  async dispatch(
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    content: { subject?: string; body: string },
  ): Promise<boolean> {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for channel: ${channel}`);
    }

    return handler(recipient, content);
  }

  async dispatchAll(
    channels: NotificationChannel[],
    recipient: NotificationRecipient,
    content: { subject?: string; body: string },
  ): Promise<Map<NotificationChannel, boolean>> {
    const results = new Map<NotificationChannel, boolean>();

    for (const channel of channels) {
      try {
        const success = await this.dispatch(channel, recipient, content);
        results.set(channel, success);
      } catch (error) {
        results.set(channel, false);
      }
    }

    return results;
  }

  async clear(): Promise<void> {
    this.handlers.clear();
  }
}

/**
 * NotificationAuditor: Track notification lifecycle
 */
export class NotificationAuditor {
  private logs: NotificationAuditLog[] = [];

  logAction(
    notificationId: string,
    action: NotificationAuditLog['action'],
    actor: string,
    details?: Record<string, any>,
  ): NotificationAuditLog {
    const log: NotificationAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notificationId,
      action,
      actor,
      timestamp: Date.now(),
      details,
    };

    this.logs.push(log);
    return log;
  }

  getNotificationHistory(notificationId: string): NotificationAuditLog[] {
    return this.logs.filter((l) => l.notificationId === notificationId);
  }

  getActionLogs(action: NotificationAuditLog['action'], limit: number = 100): NotificationAuditLog[] {
    return this.logs.filter((l) => l.action === action).slice(-limit);
  }

  getLogs(limit: number = 100): NotificationAuditLog[] {
    return this.logs.slice(-limit);
  }

  async clear(): Promise<void> {
    this.logs = [];
  }
}

/**
 * NotificationHub: Unified notification orchestration
 */
export class NotificationHub {
  private templateManager: NotificationTemplateManager;
  private recipientManager: RecipientManager;
  private queue: NotificationQueue;
  private dispatcher: NotificationDispatcher;
  private auditor: NotificationAuditor;

  constructor() {
    this.templateManager = new NotificationTemplateManager();
    this.recipientManager = new RecipientManager();
    this.queue = new NotificationQueue();
    this.dispatcher = new NotificationDispatcher();
    this.auditor = new NotificationAuditor();
  }

  getTemplateManager(): NotificationTemplateManager {
    return this.templateManager;
  }

  getRecipientManager(): RecipientManager {
    return this.recipientManager;
  }

  getQueue(): NotificationQueue {
    return this.queue;
  }

  getDispatcher(): NotificationDispatcher {
    return this.dispatcher;
  }

  getAuditor(): NotificationAuditor {
    return this.auditor;
  }

  async sendNotification(
    templateId: string,
    recipients: NotificationRecipient[],
    variables: Record<string, any>,
    channels: NotificationChannel[],
    priority: NotificationPriority = 'normal',
    actor: string = 'system',
  ): Promise<NotificationPayload> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payload: NotificationPayload = {
      id: notificationId,
      templateId,
      recipients,
      variables,
      channels,
      priority,
      createdAt: Date.now(),
    };

    this.queue.enqueue(payload);
    this.auditor.logAction(notificationId, 'created', actor, { recipientCount: recipients.length, channels });

    const content = this.templateManager.renderTemplate(templateId, variables);

    for (const recipient of recipients) {
      if (recipient.preferences?.unsubscribe_types?.includes(templateId)) {
        continue;
      }

      const availableChannels = channels.filter(
        (c) => !recipient.preferences?.channels || recipient.preferences.channels.includes(c),
      );

      const results = await this.dispatcher.dispatchAll(availableChannels, recipient, content);

      for (const [channel, success] of results.entries()) {
        const delivery: NotificationDelivery = {
          id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          notificationId,
          recipientId: recipient.id,
          channel,
          status: success ? 'delivered' : 'failed',
          sentAt: Date.now(),
          deliveredAt: success ? Date.now() : undefined,
          retryCount: 0,
        };

        this.queue.recordDelivery(delivery);
        this.auditor.logAction(notificationId, success ? 'delivered' : 'failed', actor, {
          recipientId: recipient.id,
          channel,
        });
      }
    }

    return payload;
  }

  async scheduleNotification(
    templateId: string,
    recipients: NotificationRecipient[],
    variables: Record<string, any>,
    channels: NotificationChannel[],
    scheduledFor: number,
    priority: NotificationPriority = 'normal',
    actor: string = 'system',
  ): Promise<NotificationPayload> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payload: NotificationPayload = {
      id: notificationId,
      templateId,
      recipients,
      variables,
      channels,
      priority,
      scheduledFor,
      createdAt: Date.now(),
    };

    this.queue.enqueue(payload);
    this.auditor.logAction(notificationId, 'created', actor, {
      recipientCount: recipients.length,
      channels,
      scheduledFor,
    });

    return payload;
  }

  getNotificationStatus(notificationId: string): {
    notification: NotificationPayload | undefined;
    deliveryStatus: Record<string, number>;
    history: NotificationAuditLog[];
  } {
    return {
      notification: this.queue.dequeue(notificationId),
      deliveryStatus: this.queue.getDeliveryStatus(notificationId),
      history: this.auditor.getNotificationHistory(notificationId),
    };
  }

  async clear(): Promise<void> {
    await this.templateManager.clear();
    await this.recipientManager.clear();
    await this.queue.clear();
    await this.dispatcher.clear();
    await this.auditor.clear();
  }
}
