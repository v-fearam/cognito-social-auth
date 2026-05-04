type ApiResultViewModel = {
  rawText: string;
  controllerMessage?: string;
  businessResult?: string;
};

type ApiResultsPanelProps = {
  profileResponse: ApiResultViewModel | null;
  viewerResponse: ApiResultViewModel | null;
  adminResponse: ApiResultViewModel | null;
};

function renderResponseDetails(response: ApiResultViewModel | null) {
  if (!response) {
    return <pre className="result-block">No request executed yet.</pre>;
  }

  return (
    <>
      <pre className="result-block">{response.rawText}</pre>
      {response.controllerMessage && (
        <p className="panel-copy">Controller message: {response.controllerMessage}</p>
      )}
      {response.businessResult && (
        <p className="panel-copy">Business logic simulation: {response.businessResult}</p>
      )}
    </>
  );
}

export function ApiResultsPanel({
  profileResponse,
  viewerResponse,
  adminResponse,
}: ApiResultsPanelProps) {
  return (
    <section className="results-grid">
      <article className="panel">
        <h3 className="panel-title">/api/profile response</h3>
        {renderResponseDetails(profileResponse)}
      </article>
      <article className="panel">
        <h3 className="panel-title">/api/viewer response</h3>
        {renderResponseDetails(viewerResponse)}
      </article>
      <article className="panel">
        <h3 className="panel-title">/api/admin response</h3>
        {renderResponseDetails(adminResponse)}
      </article>
    </section>
  );
}
