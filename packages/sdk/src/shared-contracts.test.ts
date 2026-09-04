import type {
  LocalJobResponse as SharedLocalJobResponse,
  LocalJobsResponse as SharedLocalJobsResponse,
  SceneSimulation as SharedSceneSimulation,
} from '@omega-v/types';
import type {
  LocalJobResponse as SdkLocalJobResponse,
  LocalJobsResponse as SdkLocalJobsResponse,
  SceneSimulation as SdkSceneSimulation,
} from './index';

type IsExactly<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
      ? true
      : false
    : false;

type Assert<Condition extends true> = Condition;

type SharedSdkContractsRemainIdentical = [
  Assert<IsExactly<SdkLocalJobsResponse, SharedLocalJobsResponse>>,
  Assert<IsExactly<SdkLocalJobResponse, SharedLocalJobResponse>>,
  Assert<IsExactly<SdkSceneSimulation, SharedSceneSimulation>>,
];

describe('shared SDK contracts', () => {
  it('re-exports the canonical type registry without a local shadow type', () => {
    const compileTimeContract: SharedSdkContractsRemainIdentical = [true, true, true];

    expect(compileTimeContract).toEqual([true, true, true]);
  });
});
