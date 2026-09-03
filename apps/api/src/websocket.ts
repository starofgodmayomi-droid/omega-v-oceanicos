/**
 * WebSocket connection handler for real-time verification updates
 */

import { WebSocket, WebSocketServer } from 'ws';
import { Server as HTTPServer } from 'http';
import { EventBroadcaster, VerificationEvent, parseFilter, createMessage } from '@omega-v/runtime';

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  subscriptionId?: string;
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(
  httpServer: HTTPServer,
  broadcaster: EventBroadcaster,
): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocketClient>();

  wss.on('connection', (ws: WebSocket) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const client: WebSocketClient = { id: clientId, ws };

    clients.set(clientId, client);
    const clientCount = clients.size;
    console.log(`[WebSocket] Client ${clientId} connected. Total clients: ${clientCount}`);

    ws.send(JSON.stringify(createMessage('subscribe', { clientId, message: 'Connected' })));

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'subscribe') {
          handleSubscription(client, message, broadcaster);
        } else if (message.type === 'unsubscribe') {
          handleUnsubscription(client);
        } else if (message.type === 'history') {
          handleHistoryRequest(client, message, broadcaster);
        } else if (message.type === 'metrics') {
          handleMetricsRequest(client, broadcaster);
        }
      } catch (error) {
        console.error(`[WebSocket] Error processing message from ${clientId}:`, error);
        ws.send(
          JSON.stringify(
            createMessage('error', {
              message: 'Failed to process message',
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          ),
        );
      }
    });

    ws.on('close', () => {
      if (client.subscriptionId) {
        broadcaster.unsubscribe(client.subscriptionId);
      }
      clients.delete(clientId);
      console.log(`[WebSocket] Client ${clientId} disconnected. Total clients: ${clients.size}`);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error on client ${clientId}:`, error);
    });
  });

  return wss;
}

/**
 * Handle subscription request
 */
function handleSubscription(
  client: WebSocketClient,
  message: any,
  broadcaster: EventBroadcaster,
): void {
  const filter = parseFilter(message.payload?.filter);

  const subscriptionId = broadcaster.subscribe(
    client.id,
    (event: VerificationEvent) => {
      if (client.ws.readyState === 1) {
        client.ws.send(
          JSON.stringify(
            createMessage('event', {
              type: event.type,
              id: event.id,
              timestamp: event.timestamp,
              data: event.data,
              source: event.source,
            }),
          ),
        );
      }
    },
    filter,
  );

  client.subscriptionId = subscriptionId.toString();

  client.ws.send(
    JSON.stringify(
      createMessage('subscribe', {
        message: 'Subscribed successfully',
        filter: message.payload?.filter || 'all events',
      }),
    ),
  );

  console.log(`[WebSocket] Client ${client.id} subscribed with filter: ${message.payload?.filter || 'none'}`);
}

/**
 * Handle unsubscription request
 */
function handleUnsubscription(client: WebSocketClient): void {
  if (client.subscriptionId) {
    client.ws.send(
      JSON.stringify(
        createMessage('unsubscribe', {
          message: 'Unsubscribed successfully',
        }),
      ),
    );
    console.log(`[WebSocket] Client ${client.id} unsubscribed`);
  }
}

/**
 * Handle history request
 */
function handleHistoryRequest(client: WebSocketClient, message: any, broadcaster: EventBroadcaster): void {
  const limit = message.payload?.limit || 50;
  const type = message.payload?.type;

  let history;
  if (type) {
    history = broadcaster.getHistoryByType(type as VerificationEvent['type'], limit);
  } else {
    history = broadcaster.getHistory(limit);
  }

  client.ws.send(
    JSON.stringify(
      createMessage('history', {
        events: history,
        count: history.length,
      }),
    ),
  );
}

/**
 * Handle metrics request
 */
function handleMetricsRequest(client: WebSocketClient, broadcaster: EventBroadcaster): void {
  const metrics = broadcaster.getMetrics();

  client.ws.send(
    JSON.stringify(
      createMessage('metrics', {
        ...metrics,
      }),
    ),
  );
}
