type ApiActionsPanelProps = {
  onProfileApiRequest: () => void;
  onAdminApiRequest: () => void;
};

export function ApiActionsPanel({ onProfileApiRequest, onAdminApiRequest }: ApiActionsPanelProps) {
  return (
    <section className="panel">
      <h3 className="panel-title">API actions</h3>
      <div className="actions-row">
        <button className="action-btn" onClick={onProfileApiRequest}>
          Call /api/profile
        </button>
        <button className="action-btn" onClick={onAdminApiRequest}>
          Call /api/admin
        </button>
      </div>
    </section>
  );
}
