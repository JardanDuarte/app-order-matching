import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event) {
    event.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Digite um username');
      return;
    }

    try {
      setLoading(true);
      const data = await login(username.trim());

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="mb-4">
          <h1>USD/BTC Exchange</h1>
        </div>

        <form onSubmit={handleLogin}>
          <label className="form-label">Username</label>
          <input
            className="form-control form-control-lg mb-3"
            placeholder="Digite seu username"
            value={username}
            onChange={event => setUsername(event.target.value)}
          />

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <button className="btn btn-primary btn-lg w-100" disabled={loading}>
            {loading ? 'Entering...' : 'Enter'}
          </button>
        </form>
      </section>
    </main>
  );
}
