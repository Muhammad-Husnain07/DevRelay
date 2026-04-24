import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');

  useState(() => {
    if (token) {
      localStorage.setItem('devrelay_token', token);
      window.location.href = '/dashboard';
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    window.location.href = '/api/auth/github';
  };

  return (
    <div className="min-h-screen bg-devrelay-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-devrelay-surface border border-devrelay-border rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-devrelay-green">DevRelay</h1>
          <p className="text-devrelay-text-dim mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-devrelay-red/10 border border-devrelay-red/30 text-devrelay-red px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-3 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-3 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-devrelay-green text-devrelay-bg font-semibold py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleGitHubLogin}
            className="w-full bg-devrelay-surface2 border border-devrelay-border text-devrelay-text font-medium py-3 rounded hover:bg-devrelay-border transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.475 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <p className="mt-6 text-center text-devrelay-text-dim">
          Don't have an account?{' '}
          <Link to="/register" className="text-devrelay-green hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}