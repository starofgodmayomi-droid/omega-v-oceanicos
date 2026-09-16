import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import type {
  OmegaCommand,
  OmegaCommandResult,
  OmegaCommandStatus,
  OmegaLifecycleEvent,
  OmegaEventType,
} from '@oceanicos/types';

export class OmegaCommandStore {
  private readonly commands = new Map<string, OmegaCommand>();
  private readonly results = new Map<string, OmegaCommandResult>();
  private readonly idempotencyMap = new Map<string, string>(); // idempotencyKey -> commandId
  private readonly events: OmegaLifecycleEvent[] = [];
  private readonly emitter = new EventEmitter();

  public saveCommand(command: OmegaCommand): void {
    this.commands.set(command.commandId, command);
    if (command.idempotencyKey) {
      this.idempotencyMap.set(command.idempotencyKey, command.commandId);
    }
  }

  public getCommand(commandId: string): OmegaCommand | undefined {
    return this.commands.get(commandId);
  }

  public getCommandByIdempotencyKey(key: string): OmegaCommand | undefined {
    const id = this.idempotencyMap.get(key);
    return id ? this.commands.get(id) : undefined;
  }

  public updateCommandStatus(
    commandId: string,
    newStatus: OmegaCommandStatus,
    reason?: string
  ): OmegaCommand {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`COMMAND_NOT_FOUND: ${commandId}`);
    }

    // Validate legal transitions
    const legalTransitions: Record<OmegaCommandStatus, OmegaCommandStatus[]> = {
      PROPOSED: ['REVIEW', 'DENIED', 'AUTHORIZED', 'FAILED'],
      REVIEW: ['AUTHORIZED', 'DENIED', 'FAILED'],
      DENIED: [],
      AUTHORIZED: ['EXECUTED', 'FAILED'],
      EXECUTED: ['ATTESTED', 'VERIFIED', 'DIVERGENT', 'UNKNOWN', 'FAILED'],
      ATTESTED: ['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'FAILED'],
      VERIFIED: [],
      DIVERGENT: [],
      UNKNOWN: [],
      FAILED: [],
    };

    const allowed = legalTransitions[command.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `ILLEGAL_STATUS_TRANSITION: Cannot transition from ${command.status} to ${newStatus}`
      );
    }

    command.status = newStatus;
    if (reason) {
      command.statusReason = reason;
    }

    return command;
  }

  public saveResult(result: OmegaCommandResult): void {
    this.results.set(result.commandId, result);
  }

  public getResult(commandId: string): OmegaCommandResult | undefined {
    return this.results.get(commandId);
  }

  public listCommands(limit: number = 50): OmegaCommand[] {
    return Array.from(this.commands.values()).slice(-limit).reverse();
  }

  public listResults(): OmegaCommandResult[] {
    return Array.from(this.results.values());
  }

  public appendEvent(event: Omit<OmegaLifecycleEvent, 'eventId' | 'timestamp'>): OmegaLifecycleEvent {
    const fullEvent: OmegaLifecycleEvent = {
      eventId: `evt_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.events.push(fullEvent);
    this.emitter.emit('omega_event', fullEvent);
    return fullEvent;
  }

  public listEvents(options?: { commandId?: string; eventType?: OmegaEventType; limit?: number }): OmegaLifecycleEvent[] {
    let filtered = this.events;
    if (options?.commandId) {
      filtered = filtered.filter((e) => e.commandId === options.commandId);
    }
    if (options?.eventType) {
      filtered = filtered.filter((e) => e.eventType === options.eventType);
    }
    const limit = options?.limit ?? 50;
    return filtered.slice(-limit).reverse();
  }

  public onEvent(listener: (event: OmegaLifecycleEvent) => void): () => void {
    this.emitter.on('omega_event', listener);
    return () => {
      this.emitter.off('omega_event', listener);
    };
  }
}

