import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import type {
  OmegaCommand,
  OmegaCommandResult,
  OmegaCommandStatus,
  OmegaLifecycleEvent,
  OmegaEventType,
} from '@oceanicos/types';

export interface OmegaLedgerRecord {
  readonly type: 'COMMAND' | 'RESULT' | 'EVENT';
  readonly payload: OmegaCommand | OmegaCommandResult | OmegaLifecycleEvent;
  readonly timestamp: string;
}

export class OmegaCommandStore {
  private readonly commands = new Map<string, OmegaCommand>();
  private readonly results = new Map<string, OmegaCommandResult>();
  private readonly idempotencyMap = new Map<string, string>(); // idempotencyKey -> commandId
  private readonly events: OmegaLifecycleEvent[] = [];
  private readonly emitter = new EventEmitter();
  public readonly ledgerPath?: string;

  constructor(ledgerPath?: string) {
    if (ledgerPath && ledgerPath !== ':memory:') {
      this.ledgerPath = ledgerPath;
      this.initializeLedger();
    }
  }

  private initializeLedger(): void {
    if (!this.ledgerPath) return;
    try {
      const dir = path.dirname(this.ledgerPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.ledgerPath)) {
        const content = fs.readFileSync(this.ledgerPath, 'utf8');
        const lines = content.split('\n').filter((l) => l.trim().length > 0);
        for (const line of lines) {
          try {
            const record = JSON.parse(line) as OmegaLedgerRecord;
            if (record.type === 'COMMAND') {
              const cmd = record.payload as OmegaCommand;
              this.commands.set(cmd.commandId, cmd);
              if (cmd.idempotencyKey) {
                this.idempotencyMap.set(cmd.idempotencyKey, cmd.commandId);
              }
            } else if (record.type === 'RESULT') {
              const res = record.payload as OmegaCommandResult;
              this.results.set(res.commandId, res);
            } else if (record.type === 'EVENT') {
              const ev = record.payload as OmegaLifecycleEvent;
              this.events.push(ev);
            }
          } catch {
            // Ignore corrupted or partial line
          }
        }
      }
    } catch (err) {
      console.warn(`[OmegaCommandStore] Ledger recovery warning: ${(err as Error).message}`);
    }
  }

  private appendToLedger(type: 'COMMAND' | 'RESULT' | 'EVENT', payload: unknown): void {
    if (!this.ledgerPath) return;
    try {
      const record: OmegaLedgerRecord = {
        type,
        payload: payload as any,
        timestamp: new Date().toISOString(),
      };
      fs.appendFileSync(this.ledgerPath, JSON.stringify(record) + '\n', 'utf8');
    } catch (err) {
      console.error(`[OmegaCommandStore] Failed to write to ledger: ${(err as Error).message}`);
    }
  }

  public saveCommand(command: OmegaCommand): void {
    this.commands.set(command.commandId, command);
    if (command.idempotencyKey) {
      this.idempotencyMap.set(command.idempotencyKey, command.commandId);
    }
    this.appendToLedger('COMMAND', command);
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

    this.appendToLedger('COMMAND', command);
    return command;
  }

  public saveResult(result: OmegaCommandResult): void {
    this.results.set(result.commandId, result);
    this.appendToLedger('RESULT', result);
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
    this.appendToLedger('EVENT', fullEvent);
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

