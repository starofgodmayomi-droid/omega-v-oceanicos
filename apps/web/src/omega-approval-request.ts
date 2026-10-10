export function omegaOperatorHeaders(operatorId = 'dashboard-operator'): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-omega-operator-id': operatorId,
  };
}

export function omegaApprovalRequest(operatorId = 'dashboard-operator'): RequestInit {
  return {
    method: 'POST',
    headers: omegaOperatorHeaders(operatorId),
    body: JSON.stringify({ operator: operatorId }),
  };
}
