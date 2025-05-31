'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getBatches,
  createBatch,
  Batch,
  getAuthStatus,
  login,
  logout
} from '../../services/api';

export default function HomePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBatchName, setNewBatchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // --- Fetch Batches (Moved to useCallback) ---
  const fetchBatches = useCallback(async () => {
    if (isLoggedIn) { // Only fetch if logged in
      setLoading(true);
      setError(null);
      const response = await getBatches();
      if (response.success && response.batches) {
        setBatches(response.batches);
      } else {
        setError(response.message || 'Failed to load Lightboxes.');
      }
      setLoading(false);
    }
  }, [isLoggedIn, setBatches, setLoading, setError, getBatches]); // Added getBatches to dependencies

  // --- Auth Status Check ---
  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await getAuthStatus();
      if (response.success && response.isLoggedIn) {
        setIsLoggedIn(true);
        // If logged in, fetch batches immediately
        fetchBatches(); // No need to await here
      } else {
        setIsLoggedIn(false);
        setLoading(false); // Stop loading if not logged in
      }
    } catch (err) {
      console.error("Failed to check auth status:", err);
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, [fetchBatches, getAuthStatus, setLoading]); // Added setIsLoadingLoggedIn, setLoading

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // --- Login Handler ---
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    const response = await login(username, password);
    if (response.success) {
      setIsLoggedIn(true);
      alert(response.message || 'Login successful!');
      router.push('/batches'); // Redirect to batches page after login
    } else {
      setLoginError(response.message || 'Login failed.');
    }
    setLoginLoading(false);
  };

  // --- Logout Handler ---
  const handleLogout = async () => {
    const response = await logout();
    if (response.success) {
      setIsLoggedIn(false);
      setUsername('');
      setPassword('');
      setBatches([]); // Clear batches on logout
      alert(response.message || 'Logged out successfully!');
      router.push('/'); // Stay on homepage, which will now show login form
    } else {
      setLoginError(response.message || 'Logout failed.');
    }
  };


  // --- Create Batch Handler ---
  const handleCreateBatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) {
      setError('Lightbox name cannot be empty.');
      return;
    }
    setIsCreating(true);
    setError(null);
    const response = await createBatch(newBatchName.trim());
    if (response.success && response.batch) {
      setBatches(prevBatches => [response.batch!, ...prevBatches]); // Added '!'
      setNewBatchName('');
      alert(response.message || 'Lightbox created successfully!');
      router.push(`/batches/${response.batch.id}`); // Redirect to new batch details
    } else {
      setError(response.message || 'Failed to create Lightbox.');
    }
    setIsCreating(false);
  };

  // --- Render Logic ---
  if (isLoggedIn === null) {
    return (
      <div className="p-8 text-center text-xl font-semibold text-gray-700">
        <p>Checking authentication status...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen-centered bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Login</h1>

          {loginError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-gray-700 text-sm font-semibold mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                className="shadow-sm appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={loginLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="shadow-sm appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loginLoading}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loginLoading}
            >
              {loginLoading ? 'Logging In...' : 'Login'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Do not have an account?{' '} {/* Corrected: Escaped quote */}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-800">
              Register here
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // If logged in, show the main dashboard content
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 border-gray-300">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome!</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          disabled={loginLoading} // Use loginLoading to prevent multiple logout clicks
        >
          Logout
        </button>
      </div>

      {/* Create New Batch Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Lightbox</h2>
        <form onSubmit={handleCreateBatch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isCreating}
            maxLength={255}
            placeholder="Enter new Lightbox name"
          />
          <button
            type="submit"
            disabled={isCreating || !newBatchName.trim()}
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create Lightbox'}
          </button>
        </form>
      </div>

      {/* Batches List */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Lightboxes ({batches.length})</h2>
      {loading ? (
        <div className="p-8 text-center text-xl font-semibold text-gray-700">
          <p>Loading Lightboxes...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-red-500 text-center text-xl font-semibold bg-red-100 border border-red-400 rounded-lg">
          Error: {error}
        </div>
      ) : batches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {batches.map((batch) => (
            <Link key={batch.id} href={`/batches/${batch.id}`} className="block">
              <div className="border border-gray-200 p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer h-full flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg mb-1 break-words">{batch.name}</h3>
                  <p className="text-sm text-gray-600">Items: {batch.item_count}</p>
                  <p className="text-sm text-gray-600">Playable: {batch.playable_media_count}</p>
                  <p className="text-xs text-gray-500 mt-1">Created: {new Date(batch.creation_timestamp * 1000).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Last Modified: {new Date(batch.last_modified_timestamp * 1000).toLocaleString()}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${batch.is_shared ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {batch.is_shared ? 'Public' : 'Private'}
                  </span>
                  <div className="flex items-center space-x-2">
                    {/* Placeholder for future icons or actions, if needed */}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No Lightboxes found. Create one above!</p>
      )}
    </div>
  );
}
