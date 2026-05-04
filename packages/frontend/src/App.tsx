import './App.css';
import { useCallback, useMemo, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { ApiActionsPanel } from './components/ApiActionsPanel';
import { ApiResultsPanel } from './components/ApiResultsPanel';
import { DashboardHeader } from './components/DashboardHeader';
import { ErrorPanel, LoadingPanel, SignInPanel } from './components/AuthPanels';
import { SummaryCards } from './components/SummaryCards';

const BACKEND_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const COGNITO_HOSTED_UI_BASE_URL = import.meta.env.VITE_COGNITO_DOMAIN as string;
const COGNITO_APP_CLIENT_ID = import.meta.env.VITE_COGNITO_APP_CLIENT_ID as string;
const COGNITO_POST_LOGOUT_REDIRECT_URI = import.meta.env.VITE_COGNITO_SIGNOUT_URI as string;

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
  const authContext = useAuth();
  const [profileResponse, setProfileResponse] = useState<ApiResultViewModel | null>(null);
  const [viewerResponse, setViewerResponse] = useState<ApiResultViewModel | null>(null);
  const [adminResponse, setAdminResponse] = useState<ApiResultViewModel | null>(null);
  const isAuthenticated = authContext.isAuthenticated;
  const isLoading = authContext.isLoading;
  const authError = authContext.error;

  const groups = useMemo(
    () => ((authContext.user?.profile['cognito:groups'] as string[] | undefined) ?? []),
    [authContext.user?.profile],
  );

  const userEmail = useMemo(() => authContext.user?.profile.email || '', [authContext.user?.profile.email]);

  const userName = useMemo(() => {
    const emailLocalPart = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;

    return (
      emailLocalPart ||
      String(authContext.user?.profile.preferred_username || authContext.user?.profile.name || 'User')
    );
  }, [authContext.user?.profile.name, authContext.user?.profile.preferred_username, userEmail]);

  const groupsLabel = useMemo(
    () => (groups.length > 0 ? groups.join(', ') : 'No groups assigned'),
    [groups],
  );
  const tierLabel = useMemo(
    () => String(authContext.user?.profile['custom:tier'] || 'No tier claim'),
    [authContext.user?.profile],
  );

  const profileLabel = userEmail || userName;

  const handleSignOut = useCallback(() => {
    authContext.removeUser();
    window.location.href = `${COGNITO_HOSTED_UI_BASE_URL}/logout?client_id=${COGNITO_APP_CLIENT_ID}&logout_uri=${encodeURIComponent(COGNITO_POST_LOGOUT_REDIRECT_URI)}`;
  }, [authContext]);

  const handleSignIn = useCallback(() => {
    authContext.signinRedirect();
  }, [authContext]);

  const fetchProtectedEndpoint = useCallback(async (path: ProtectedApiPath, onResult: (value: ApiResultViewModel) => void) => {
    if (!authContext.user?.access_token) {
      onResult({ rawText: 'No access token available. Please sign in again.' });
      return;
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
        headers: {
          Authorization: `Bearer ${authContext.user.access_token}`,
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
    }
  }, [authContext.user?.access_token]);

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

          {isLoading && <LoadingPanel />}

          {authError && <ErrorPanel message={authError.message} />}

          {!isLoading && !authError && !isAuthenticated && <SignInPanel onSignIn={handleSignIn} />}

          {!isLoading && !authError && isAuthenticated && (
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
