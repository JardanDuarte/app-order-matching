import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from '../features/auth/pages/Login';
import Dashboard from '../features/market/pages/Dashboard';
import './styles.css';

function AuthRequired() {
  return (
    <main className="login-page">
      <section className="login-panel text-center">
        <span className="eyebrow">Authentication required</span>
        <h1 className="mb-3">Access denied</h1>
        <p className="text-muted mb-4">
          You need to authenticate before accessing the exchange dashboard.
        </p>
        <a className="btn btn-primary btn-lg w-100" href="/">
          Go to login
        </a>
      </section>
    </main>
  );
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <AuthRequired />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  );
}
