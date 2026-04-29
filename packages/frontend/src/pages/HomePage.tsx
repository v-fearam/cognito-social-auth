import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <section>
      <h2>Phase 0: Local App (No Auth)</h2>
      <p>
        This initial version has no login or authorization yet. Use the buttons below to call
        open backend endpoints.
      </p>

      <div className="actions">
        <Link to="/profile">View Profile Endpoint</Link>
        <Link to="/admin">View Admin Endpoint</Link>
      </div>
    </section>
  );
}
