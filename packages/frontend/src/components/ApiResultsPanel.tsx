type ApiResultsPanelProps = {
  profileResponseText: string;
  adminResponseText: string;
};

export function ApiResultsPanel({ profileResponseText, adminResponseText }: ApiResultsPanelProps) {
  return (
    <section className="results-grid">
      <article className="panel">
        <h3 className="panel-title">/api/profile response</h3>
        <pre className="result-block">{profileResponseText || 'No request executed yet.'}</pre>
      </article>
      <article className="panel">
        <h3 className="panel-title">/api/admin response</h3>
        <pre className="result-block">{adminResponseText || 'No request executed yet.'}</pre>
      </article>
    </section>
  );
}
