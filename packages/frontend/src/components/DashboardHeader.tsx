type DashboardHeaderProps = {
  isAuthenticated: boolean;
  userName: string;
  onSignOut: () => void;
};

export function DashboardHeader({ isAuthenticated, userName, onSignOut }: DashboardHeaderProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Secure Authentication</p>
        <h2 className="title">Cognito Social Auth Dashboard</h2>
      </div>

      {isAuthenticated ? (
        <div className="topbar-actions">
          <p className="user-chip">{userName}</p>
          <button className="action-btn action-btn-danger" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      ) : (
        <p className="session-tag">Not signed in</p>
      )}
    </header>
  );
}
