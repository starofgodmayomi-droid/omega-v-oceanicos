/**
 * Express middleware for notification management
 * Provides endpoints for templates, recipients, notifications, and delivery tracking
 */

import { Request, Response, NextFunction } from 'express';
import {
  NotificationHub,
  NotificationChannel,
  NotificationPriority,
  NotificationRecipient,
} from '@omega-v/runtime';

export interface NotificationMiddlewareOptions {
  hub: NotificationHub;
}

declare global {
  namespace Express {
    interface Request {
      notifications?: {
        hub: NotificationHub;
      };
    }
  }
}

export function attachNotificationMiddleware(options: NotificationMiddlewareOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.notifications = {
      hub: options.hub,
    };
    next();
  };
}

/**
 * Register notification template endpoint
 */
export function registerTemplateEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    const { id, name, channel, body, subject, variables } = req.body;

    if (!id || !name || !channel || !body) {
      return res.status(400).json({
        error: 'Missing required fields: id, name, channel, body',
      });
    }

    try {
      const template = hub
        .getTemplateManager()
        .registerTemplate(id, name, channel as NotificationChannel, body, subject, variables || []);

      res.status(201).json({
        id: template.id,
        name: template.name,
        channel: template.channel,
        variables: template.variables,
        createdAt: new Date(template.createdAt).toISOString(),
        message: 'Template registered successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Template registration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get notification template endpoint
 */
export function getTemplateEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    const { templateId } = req.params;

    try {
      const template = hub.getTemplateManager().getTemplate(templateId);

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
          templateId,
        });
      }

      res.json({
        id: template.id,
        name: template.name,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        createdAt: new Date(template.createdAt).toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve template',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * List notification templates endpoint
 */
export function listTemplatesEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    const { channel } = req.query;

    try {
      const templates = hub.getTemplateManager().listTemplates(channel as NotificationChannel);

      res.json({
        count: templates.length,
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          channel: t.channel,
          createdAt: new Date(t.createdAt).toISOString(),
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list templates',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Register recipient endpoint
 */
export function registerRecipientEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    const { id, type, address, preferences } = req.body;

    if (!id || !type || !address) {
      return res.status(400).json({
        error: 'Missing required fields: id, type, address',
      });
    }

    try {
      const recipient: NotificationRecipient = {
        id,
        type,
        address,
        preferences,
      };

      const registered = hub.getRecipientManager().registerRecipient(recipient);

      res.status(201).json({
        id: registered.id,
        type: registered.type,
        address: registered.address,
        verified: registered.verified,
        message: 'Recipient registered successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Recipient registration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get recipient endpoint
 */
export function getRecipientEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    const { recipientId } = req.params;

    try {
      const recipient = hub.getRecipientManager().getRecipient(recipientId);

      if (!recipient) {
        return res.status(404).json({
          error: 'Recipient not found',
          recipientId,
        });
      }

      res.json({
        id: recipient.id,
        type: recipient.type,
        address: recipient.address,
        verified: recipient.verified,
        preferences: recipient.preferences,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve recipient',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Update recipient preferences endpoint
 */
export function updateRecipientPreferencesEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    const { recipientId } = req.params;
    const preferences = req.body;

    try {
      const updated = hub.getRecipientManager().updatePreferences(recipientId, preferences);

      if (!updated) {
        return res.status(404).json({
          error: 'Recipient not found',
          recipientId,
        });
      }

      res.json({
        id: updated.id,
        preferences: updated.preferences,
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update preferences',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Verify recipient endpoint
 */
export function verifyRecipientEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    const { recipientId } = req.params;

    try {
      const verified = hub.getRecipientManager().verifyRecipient(recipientId);

      if (!verified) {
        return res.status(404).json({
          error: 'Recipient not found',
          recipientId,
        });
      }

      res.json({
        recipientId,
        verified: true,
        message: 'Recipient verified successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to verify recipient',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * List recipients endpoint
 */
export function listRecipientsEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    try {
      const recipients = hub.getRecipientManager().listRecipients();

      res.json({
        count: recipients.length,
        recipients: recipients.map((r) => ({
          id: r.id,
          type: r.type,
          address: r.address,
          verified: r.verified,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list recipients',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Send notification endpoint
 */
export async function sendNotificationEndpoint(hub: NotificationHub) {
  return async (req: Request, res: Response) => {
    const { templateId, recipientIds, variables, channels, priority } = req.body;
    const actor = (req as any).user?.id || 'anonymous';

    if (!templateId || !recipientIds || !Array.isArray(recipientIds)) {
      return res.status(400).json({
        error: 'Missing required fields: templateId, recipientIds',
      });
    }

    try {
      const recipients = recipientIds
        .map((id: string) => hub.getRecipientManager().getRecipient(id))
        .filter(Boolean);

      if (recipients.length === 0) {
        return res.status(400).json({
          error: 'No valid recipients found',
        });
      }

      const payload = await hub.sendNotification(
        templateId,
        recipients,
        variables || {},
        (channels || ['email']) as NotificationChannel[],
        (priority || 'normal') as NotificationPriority,
        actor
      );

      const status = hub.getNotificationStatus(payload.id);

      res.status(202).json({
        notificationId: payload.id,
        recipients: recipients.length,
        channels: payload.channels,
        priority: payload.priority,
        status: status.deliveryStatus,
        message: 'Notification sent successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to send notification',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Schedule notification endpoint
 */
export async function scheduleNotificationEndpoint(hub: NotificationHub) {
  return async (req: Request, res: Response) => {
    const { templateId, recipientIds, variables, channels, scheduledFor, priority } = req.body;
    const actor = (req as any).user?.id || 'anonymous';

    if (!templateId || !recipientIds || !scheduledFor) {
      return res.status(400).json({
        error: 'Missing required fields: templateId, recipientIds, scheduledFor',
      });
    }

    try {
      const recipients = recipientIds
        .map((id: string) => hub.getRecipientManager().getRecipient(id))
        .filter(Boolean);

      if (recipients.length === 0) {
        return res.status(400).json({
          error: 'No valid recipients found',
        });
      }

      const payload = await hub.scheduleNotification(
        templateId,
        recipients,
        variables || {},
        (channels || ['email']) as NotificationChannel[],
        scheduledFor,
        (priority || 'normal') as NotificationPriority,
        actor
      );

      res.status(201).json({
        notificationId: payload.id,
        recipients: recipients.length,
        scheduledFor: new Date(scheduledFor).toISOString(),
        message: 'Notification scheduled successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to schedule notification',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get notification status endpoint
 */
export function getNotificationStatusEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    const { notificationId } = req.params;

    try {
      const status = hub.getNotificationStatus(notificationId);

      if (!status.notification) {
        return res.status(404).json({
          error: 'Notification not found',
          notificationId,
        });
      }

      res.json({
        notificationId,
        templateId: status.notification.templateId,
        recipients: status.notification.recipients.length,
        channels: status.notification.channels,
        priority: status.notification.priority,
        deliveryStatus: status.deliveryStatus,
        createdAt: new Date(status.notification.createdAt).toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve notification status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get notification history endpoint
 */
export function getNotificationHistoryEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    const { notificationId } = req.params;

    try {
      const history = hub.getAuditor().getNotificationHistory(notificationId);

      res.json({
        notificationId,
        count: history.length,
        events: history.map((log) => ({
          action: log.action,
          actor: log.actor,
          timestamp: new Date(log.timestamp).toISOString(),
          details: log.details,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve notification history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get audit logs endpoint
 */
export function getAuditLogsEndpoint(hub: NotificationHub) {
  return (req: Request, res: Response) => {
    const { action, limit = '100' } = req.query;

    try {
      let logs = hub.getAuditor().getLogs(parseInt(limit as string));

      if (action) {
        logs = hub.getAuditor().getActionLogs(action as any, parseInt(limit as string));
      }

      res.json({
        count: logs.length,
        logs: logs.map((l) => ({
          id: l.id,
          notificationId: l.notificationId,
          action: l.action,
          actor: l.actor,
          timestamp: new Date(l.timestamp).toISOString(),
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Initialize notification middleware stack
 */
export function initializeNotificationMiddleware(
  options: NotificationMiddlewareOptions,
  enableEndpoints?: boolean
) {
  const endpoints = [];

  if (enableEndpoints !== false) {
    endpoints.push((req: Request, res: Response, next: NextFunction) => {
      // Template endpoints
      if (req.method === 'POST' && req.path === '/api/notifications/templates') {
        return registerTemplateEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path === '/api/notifications/templates') {
        return listTemplatesEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/notifications\/templates\/[^\/]+$/)) {
        const templateId = req.path.split('/')[4];
        req.params.templateId = templateId;
        return getTemplateEndpoint(options.hub)(req, res);
      }

      // Recipient endpoints
      if (req.method === 'POST' && req.path === '/api/notifications/recipients') {
        return registerRecipientEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path === '/api/notifications/recipients') {
        return listRecipientsEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/notifications\/recipients\/[^\/]+$/)) {
        const recipientId = req.path.split('/')[4];
        req.params.recipientId = recipientId;
        return getRecipientEndpoint(options.hub)(req, res);
      }
      if (
        req.method === 'POST' &&
        req.path.match(/^\/api\/notifications\/recipients\/[^\/]+\/verify$/)
      ) {
        const recipientId = req.path.split('/')[4];
        req.params.recipientId = recipientId;
        return verifyRecipientEndpoint(options.hub)(req, res);
      }
      if (
        req.method === 'PUT' &&
        req.path.match(/^\/api\/notifications\/recipients\/[^\/]+\/preferences$/)
      ) {
        const recipientId = req.path.split('/')[4];
        req.params.recipientId = recipientId;
        return updateRecipientPreferencesEndpoint(options.hub)(req, res);
      }

      // Notification endpoints
      if (req.method === 'POST' && req.path === '/api/notifications/send') {
        return sendNotificationEndpoint(options.hub)(req, res);
      }
      if (req.method === 'POST' && req.path === '/api/notifications/schedule') {
        return scheduleNotificationEndpoint(options.hub)(req, res);
      }
      if (
        req.method === 'GET' &&
        req.path.match(/^\/api\/notifications\/[^\/]+$/) &&
        !req.path.includes('/verify')
      ) {
        const notificationId = req.path.split('/')[3];
        req.params.notificationId = notificationId;
        return getNotificationStatusEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/notifications\/[^\/]+\/history$/)) {
        const notificationId = req.path.split('/')[3];
        req.params.notificationId = notificationId;
        return getNotificationHistoryEndpoint(options.hub)(req, res);
      }

      // Audit endpoint
      if (req.method === 'GET' && req.path === '/api/notifications/audit-logs') {
        return getAuditLogsEndpoint(options.hub)(req, res);
      }

      next();
    });
  }

  return [attachNotificationMiddleware(options), ...endpoints];
}
