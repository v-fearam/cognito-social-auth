import './App.css';
import { useCallback, useMemo, useState } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { loginRequest } from './authConfig';
import { ApiActionsPanel } from './components/ApiActionsPanel';
import { ApiResultsPanel } from './components/ApiResultsPanel';
import { DashboardHeader } from './components/DashboardHeader';
import { ErrorPanel, LoadingPanel, SignInPanel } from './components/AuthPanels';
import { SummaryCards } from './components/SummaryCards';

const BACKEND_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type ProtectedApiPath = '/api/profile' | '/api/viewer' | '/api/admin';
type ApiResultViewModel = {
  rawText: string;
  controllerMessage?: string;
  businessResult?: string;
};

type ApiResponsePayload = {
  message?: string;
  businessResult?: string;
};

function App() {
  const { instance, accounts, inProgress } = useMsal();
  const account = accounts[0];
  const idTokenClaims = (account?.idTokenClaims ?? {}) as Record<string, unknown>;
  const [profileResponse, setProfileResponse] = useState<ApiResultViewModel | null>(null);
  const [viewerResponse, setViewerResponse] = useState<ApiResultViewModel | null>(null);
  const [adminResponse, setAdminResponse] = useState<ApiResultViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const isAuthenticated = useIsAuthenticated();

  // Debug logging
  console.log('🎯 App Component Render:', {
    accounts: accounts.length,
    inProgress,
    isAuthenticated,
    account: account?.username || account?.name,
    email: idTokenClaims.email,
    roles: idTokenClaims.roles,
  });

  const groups = useMemo(
    () => ((idTokenClaims.roles as string[] | undefined) ?? []),
    [idTokenClaims],
  );

  const userEmail = useMemo(() => String(idTokenClaims.email || ''), [idTokenClaims]);

  const userName = useMemo(() => {
    const emailLocalPart = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;

    return (
      emailLocalPart ||
      String(account?.name || account?.username || 'User')
    );
  }, [account?.name, account?.username, userEmail]);

  const groupsLabel = useMemo(
    () => (groups.length > 0 ? groups.join(', ') : 'No roles assigned'),
    [groups],
  );
  const tierLabel = useMemo(
    () => String(idTokenClaims.tier || idTokenClaims['custom:tier'] || 'No tier claim'),
    [idTokenClaims],
  );

  const profileLabel = userEmail || userName;

  const handleSignOut = useCallback(() => {
    void instance.logoutRedirect();
  }, [instance]);

  const handleSignIn = useCallback(() => {
    void instance.loginRedirect(loginRequest);
  }, [instance]);

  const fetchProtectedEndpoint = useCallback(async (path: ProtectedApiPath, onResult: (value: ApiResultViewModel) => void) => {
    if (!account) {
      onResult({ rawText: 'No access token available. Please sign in again.' });
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      });

      const body = await response.text();
      let parsedPayload: ApiResponsePayload | undefined;

      try {
        parsedPayload = JSON.parse(body) as ApiResponsePayload;
      } catch {
        parsedPayload = undefined;
      }

      onResult({
        rawText: `${response.status} ${response.statusText}\n${body}`,
        controllerMessage: parsedPayload?.message,
        businessResult: parsedPayload?.businessResult,
      });
    } catch (error) {
      onResult({ rawText: error instanceof Error ? error.message : 'Unknown error' });
      setAuthError(error instanceof Error ? error.message : 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  }, [account, instance]);

  const handleProfileApiRequest = useCallback(() => {
    void fetchProtectedEndpoint('/api/profile', setProfileResponse);
  }, [fetchProtectedEndpoint]);

  const handleAdminApiRequest = useCallback(() => {
    void fetchProtectedEndpoint('/api/admin', setAdminResponse);
  }, [fetchProtectedEndpoint]);

  const handleViewerApiRequest = useCallback(() => {
    void fetchProtectedEndpoint('/api/viewer', setViewerResponse);
  }, [fetchProtectedEndpoint]);

  return (
    <div className="app-bg">
      <div className="dashboard-shell">
        <main className="workspace workspace-wide">
          <DashboardHeader
            isAuthenticated={isAuthenticated}
            userName={userName}
            onSignOut={handleSignOut}
          />

          {(isLoading || inProgress !== 'none') && <LoadingPanel />}

          {authError && <ErrorPanel message={authError} />}

          {!isLoading && inProgress === 'none' && !authError && !isAuthenticated && <SignInPanel onSignIn={handleSignIn} />}

          {!isLoading && inProgress === 'none' && !authError && isAuthenticated && (
            <>
              <SummaryCards
                profileLabel={profileLabel}
                groupsLabel={groupsLabel}
                tierLabel={tierLabel}
              />
              <ApiActionsPanel
                onProfileApiRequest={handleProfileApiRequest}
                onViewerApiRequest={handleViewerApiRequest}
                onAdminApiRequest={handleAdminApiRequest}
              />
              <ApiResultsPanel
                profileResponse={profileResponse}
                viewerResponse={viewerResponse}
                adminResponse={adminResponse}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
