import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import App from './App.tsx';
import type { ConnectorAuth } from './ConnectorPanel.tsx';
import './App.css';
import './tokens.css';

interface Auth0RuntimeConfig {
  domain: string;
  clientId: string;
  audience: string;
}

const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN?.trim(),
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID?.trim(),
  audience: import.meta.env.VITE_AUTH0_AUDIENCE?.trim(),
};

function isAuth0Configured(config: typeof auth0Config): config is Auth0RuntimeConfig {
  return Boolean(config.domain && config.clientId && config.audience);
}

function AuthenticatedApp({ audience }: { audience: string }) {
  const { isLoading, isAuthenticated, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0();
  const connectorAuth: ConnectorAuth = {
    isLoading,
    isAuthenticated,
    login: () => loginWithRedirect(),
    logout: () => logout({ logoutParams: { returnTo: window.location.origin } }),
    getAccessToken: async () => {
      const token = await getAccessTokenSilently({ authorizationParams: { audience } });
      if (!token) throw new Error('Auth0 did not return an API access token');
      return token;
    },
  };
  return <App connectorAuth={connectorAuth} />;
}

const app = isAuth0Configured(auth0Config) ? (
  <Auth0Provider
    domain={auth0Config.domain}
    clientId={auth0Config.clientId}
    cacheLocation="memory"
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: auth0Config.audience,
    }}
  >
    <AuthenticatedApp audience={auth0Config.audience} />
  </Auth0Provider>
) : (
  <App />
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{app}</React.StrictMode>
);
