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

export function sdkOmegaAdmissionRequest(
  commandId: string,
  payload: { authority: string; policy: string; authorityVerified?: boolean; policySatisfied?: boolean },
  operator = 'sdk-operator',
): {
  path: string;
  payload: { authority: string; policy: string; authorityVerified?: boolean; policySatisfied?: boolean };
  headers: Record<string, string>;
} {
  return {
    path: `/v1/omega/commands/${encodeURIComponent(commandId)}/admit`,
    payload,
    headers: { 'x-omega-operator-id': operator },
  };
}
