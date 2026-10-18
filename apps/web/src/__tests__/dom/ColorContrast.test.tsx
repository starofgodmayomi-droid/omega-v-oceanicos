import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { theme } from '../../oceanicosTheme';

const DARK_SURFACES = [
  theme.bg,
  theme.surfaceRaised,
  '#03080d',
  '#071312',
  '#0b1d1a',
] as const;

function luminance(hex: string): number {
  const channels = hex.match(/[a-f\d]{2}/gi);
  if (!channels || channels.length < 3) {
    throw new Error('Expected a six-digit hex color.');
  }
  const linear = channels.slice(0, 3).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.(?:css|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('dark UI text contrast contract', () => {
  it('keeps secondary text and UNKNOWN status readable on dark surfaces', () => {
    for (const foreground of [theme.textDim, theme.textMuted, theme.unknown]) {
      for (const background of DARK_SURFACES) {
        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('does not reintroduce retired low-contrast muted text literals', () => {
    const sourceRoot = join(process.cwd(), 'src');
    const allSource = sourceFiles(sourceRoot).map((path) => readFileSync(path, 'utf8')).join('\n');
    const retiredDim = '#64748' + 'b';
    const retiredTeal = '#547b' + '74';
    const retiredTealText = new RegExp('color\\s*:\\s*[\'"]?' + retiredTeal, 'i');

    expect(allSource).not.toContain(retiredDim);
    expect(allSource).not.toMatch(retiredTealText);
  });
});
