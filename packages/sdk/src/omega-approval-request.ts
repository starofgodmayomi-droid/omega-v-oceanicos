export function sdkOmegaApprovalRequest(
  commandId: string,
  operator = 'sdk-operator',
): {
  path: string;
  payload: { operator: string };
  headers: Record<string, string>;
} {
  return {
    path: `/v1/omega/commands/${encodeURIComponent(commandId)}/approve`,
    payload: { operator },
    headers: { 'x-omega-operator-id': operator },
  };
}
