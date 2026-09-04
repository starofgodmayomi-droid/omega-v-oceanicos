import type {
  LocalJobResponse as SharedLocalJobResponse,
  LocalJobsQuery as SharedLocalJobsQuery,
  LocalJobsResponse as SharedLocalJobsResponse,
  SceneSimulation as SharedSceneSimulation,
  SceneSimulationInput as SharedSceneSimulationInput,
  SceneSimulationResponse as SharedSceneSimulationResponse,
} from '@omega-v/types';
import type {
  LocalJobResponse as SdkLocalJobResponse,
  LocalJobsQuery as SdkLocalJobsQuery,
  LocalJobsResponse as SdkLocalJobsResponse,
  SceneSimulation as SdkSceneSimulation,
  SceneSimulationInput as SdkSceneSimulationInput,
  SceneSimulationResponse as SdkSceneSimulationResponse,
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
  Assert<IsExactly<SdkLocalJobsQuery, SharedLocalJobsQuery>>,
  Assert<IsExactly<SdkSceneSimulation, SharedSceneSimulation>>,
  Assert<IsExactly<SdkSceneSimulationInput, SharedSceneSimulationInput>>,
  Assert<IsExactly<SdkSceneSimulationResponse, SharedSceneSimulationResponse>>,
];

describe('shared SDK contracts', () => {
  it('re-exports the canonical type registry without a local shadow type', () => {
    const compileTimeContract: SharedSdkContractsRemainIdentical = [
      true,
      true,
      true,
      true,
      true,
      true,
    ];

    expect(compileTimeContract).toEqual([true, true, true, true, true, true]);
  });
});
