'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // For redirection

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const API_BASE_URL = 'http://localhost:5005/api/v1'; // Flask API URL

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Important for sending/receiving session cookies
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('Login successful:', data);
        // On successful login, redirect to the home page (which lists batches)
        router.push('/');
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
        console.error('Login error:', data.message);
      }
    } catch (err) {
      console.error('Network error during login:', err);
      setError('Failed to connect to the backend. Is the Flask API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-md items-center text-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Login</h1>
        <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg shadow-lg">
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-300 text-sm font-bold mb-2 text-left">
              Username:
            </label>
            <input
              type="text"
              id="username"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-300 text-sm font-bold mb-2 text-left">
              Password:
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 mb-3 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-gray-400">
          Test User: <strong>ross</strong>, Password: <strong>password</strong>
        </p>
      </div>
    </main>
  );
}
