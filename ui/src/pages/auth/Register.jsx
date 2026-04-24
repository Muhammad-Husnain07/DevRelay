import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function getPasswordStrength(password) {
  if (!password) return { label: '', color: '' };
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (password.length < 6 || score < 2) return { label: 'Weak', color: 'bg-devrelay-red' };
  if (password.length < 10 || score < 3) return { label: 'Medium', color: 'bg-devrelay-amber' };
  return { label: 'Strong', color: 'bg-devrelay-green' };
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-devrelay-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-devrelay-surface border border-devrelay-border rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-devrelay-green">DevRelay</h1>
          <p className="text-devrelay-text-dim mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-devrelay-red/10 border border-devrelay-red/30 text-devrelay-red px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-3 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              required
            />
          </div>

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
            {password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-devrelay-surface2 rounded overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all`} style={{ width: password.length < 6 ? '25%' : password.length < 10 ? '50%' : '100%' }} />
                </div>
                <span className="text-xs text-devrelay-text-dim">{strength.label}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-3 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || strength.label === 'Weak'}
            className="w-full bg-devrelay-green text-devrelay-bg font-semibold py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-devrelay-text-dim">
          Already have an account?{' '}
          <Link to="/login" className="text-devrelay-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}