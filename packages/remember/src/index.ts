import fs from 'node:fs';
import path from 'node:path';
import { IMiniBlock } from '@oceanicos/types';

export class RememberEngine {
  private file: string;
  private blocks: IMiniBlock[] = [];

  constructor(file = './data/oceanicos.jsonl') {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) {
      this.blocks = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    }
  }

  public getTip(): IMiniBlock | null {
    return this.blocks.at(-1) ?? null;
  }

  public getHistory(): IMiniBlock[] {
    return this.blocks;
  }

  public get height(): number {
    return this.blocks.length;
  }

  public append(block: IMiniBlock): void {
    this.blocks.push(block);
    fs.appendFileSync(this.file, `${JSON.stringify(block)}\n`);
  }
}
