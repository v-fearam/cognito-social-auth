type ErrorPanelProps = {
  message: string;
};

type SignInPanelProps = {
  onSignIn: () => void;
};

export function LoadingPanel() {
  return <section className="panel">Loading authentication session...</section>;
}

export function ErrorPanel({ message }: ErrorPanelProps) {
  return <section className="panel panel-error">Authentication error: {message}</section>;
}

export function SignInPanel({ onSignIn }: SignInPanelProps) {
  return (
    <section className="panel auth-panel">
      <h3 className="panel-title">Sign in to continue</h3>
      <p className="panel-copy">
        Authenticate with Cognito managed login, then test protected API routes using your access
        token.
      </p>
      <button className="action-btn action-btn-primary" onClick={onSignIn}>
        Sign in with Cognito
      </button>
    </section>
  );
}
