import { Link, Route, Routes } from 'react-router-dom';
import './App.css';
import { AdminPage } from './pages/AdminPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Cognito Social Auth - Phase 0</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
