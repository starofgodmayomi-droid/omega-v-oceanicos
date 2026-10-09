export function omegaApprovalRequest(operatorId = 'dashboard-operator'): RequestInit {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-omega-operator-id': operatorId,
    },
    body: JSON.stringify({ operator: operatorId }),
  };
}
