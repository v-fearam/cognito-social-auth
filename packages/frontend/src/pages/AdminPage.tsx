import { useEffect, useState } from 'react';
import { getAdmin } from '../services/api';

export function AdminPage() {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    getAdmin()
      .then(setData)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      });
  }, []);

  return (
    <section>
      <h2>Admin</h2>
      <p>Calling GET /api/admin from the local NestJS backend.</p>
      <div className="card">
        {error ? <p>Error: {error}</p> : <pre>{JSON.stringify(data, null, 2)}</pre>}
      </div>
    </section>
  );
}
