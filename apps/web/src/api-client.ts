type AccessTokenProvider = () => Promise<string>;

let accessTokenProvider: AccessTokenProvider | undefined;

export function setApiAccessTokenProvider(provider: AccessTokenProvider | undefined): void {
  accessTokenProvider = provider;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('Authorization') && accessTokenProvider) {
    const token = await accessTokenProvider();
    if (!token) throw new Error('Auth0 did not return an API access token');
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
