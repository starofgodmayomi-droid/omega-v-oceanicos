import type { IMiniBlock } from '@oceanicos/types';
import type { MiniKernel } from './index.js';
import { KaiContinuity } from './kai.js';
import type { KaiDrop, KaiSource } from './kai.js';

/**
 * Capture one bounded Mini Observe → Verify → Remember cycle in KAI.
 *
 * The caller owns the KAI continuity instance, so repeated calls preserve
 * append-only continuity. KAI records the resulting block; it does not
 * authorize, execute, or manufacture evidence.
 */
export const captureMiniKernelCycle = (
  kernel: Pick<MiniKernel, 'runCycle'>,
  kai: KaiContinuity,
  source: KaiSource,
): KaiDrop => {
  const block: IMiniBlock = kernel.runCycle();
  return kai.capture(block, source);
};
