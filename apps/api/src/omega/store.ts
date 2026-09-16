import type {
  OmegaCommand,
  OmegaCommandResult,
  OmegaCommandStatus,
} from '@oceanicos/types';

export class OmegaCommandStore {
  private readonly commands = new Map<string, OmegaCommand>();
  private readonly results = new Map<string, OmegaCommandResult>();
  private readonly idempotencyMap = new Map<string, string>(); // idempotencyKey -> commandId

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
}

