// /home/www/froogle/src/app/batches/page.tsx
'use client'; // This component will run on the client-side

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import {
  getAuthStatus,
  login,
  logout,
  getBatches,
  createBatch,
  ApiResponse,
  Batch,
  UserSession,
} from '../../services/api'; // Corrected path for this file's location

export default function BatchesOverviewPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBatchName, setNewBatchName] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // --- Authentication Check ---
  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      const response = await getAuthStatus();
      if (response.success && response.data) {
        setIsLoggedIn(response.data.isLoggedIn);
        setCurrentUser(response.data.user);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setError(response.message || 'Failed to check authentication status.');
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  // --- Fetch Batches when authenticated ---
  useEffect(() => {
    if (!isLoggedIn) {
      if (!authLoading) {
        // If not logged in and auth check is complete, set loading to false for batches
        setLoading(false);
      }
      return;
    }

    const fetchBatches = async () => {
      setLoading(true);
      setError(null);
      const response: ApiResponse<{ batches: Batch[] }> = await getBatches();
      if (response.success && response.data) {
        setBatches(response.data.batches);
      } else {
        setError(response.message || 'Failed to load batches.');
        setBatches([]);
      }
      setLoading(false);
    };

    fetchBatches();
  }, [isLoggedIn, authLoading]); // Re-fetch when login status changes

  // --- Handlers ---
  const handleCreateBatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) {
      setError('Lightbox name cannot be empty.');
      return;
    }

    setCreatingBatch(true);
    setError(null);
    const response: ApiResponse<{ batch: Batch }> = await createBatch(newBatchName.trim());
    if (response.success && response.data) {
      setNewBatchName(''); // Clear input
      // Add the new batch to the list and sort by creation timestamp (newest first)
      setBatches(prevBatches =>
        [...prevBatches, response.data!.batch].sort((a, b) => (b.creation_timestamp || 0) - (a.creation_timestamp || 0))
      );
    } else {
      setError(response.message || 'Failed to create Lightbox.');
    }
    setCreatingBatch(false);
  };

  const handleTestLogin = async () => {
    setError(null);
    const response = await login('ross', 'password'); // Use your test user credentials
    if (response.success) {
      alert('Logged in as ross! Refreshing batches...');
      setIsLoggedIn(true); // Trigger useEffect to refetch
      setCurrentUser(response.data?.user || null);
    } else {
      setError(response.message || 'Login failed.');
    }
  };

  const handleLogout = async () => {
    setError(null);
    const response = await logout();
    if (response.success) {
      alert('Logged out.');
      setIsLoggedIn(false);
      setCurrentUser(null);
      setBatches([]); // Clear batches
    } else {
      setError(response.message || 'Logout failed.');
    }
  };

  // --- Render Logic ---
  if (authLoading) {
    return <div className="p-4">Checking authentication status...</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen-centered bg-gray-50">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4 text-center">Login Required</h1>
          <p className="mb-4 text-gray-700 text-center">
            You need to be logged in to view your Lightboxes.
          </p>
          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
          <p className="text-sm text-gray-500 text-center mb-4">
            For testing, you can use the admin user `ross` with password `password`.
            Ensure you've run the `/setup_test_user` endpoint on your Flask backend.
            (e.g., <a href="http://localhost:5005/setup_test_user" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Click here to set up test user</a>)
          </p>
          <button
            onClick={handleTestLogin}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading || creatingBatch}
          >
            Login as Ross (Test)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Lightboxes</h1>
        <div className="text-right">
          {currentUser && (
            <p className="text-lg">Logged in as: <span className="font-semibold">{currentUser.username}</span></p>
          )}
          <button
            onClick={handleLogout}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline"
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Create New Batch Form */}
      <div className="mb-8 p-4 border rounded-lg shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-3">Create New Lightbox</h2>
        <form onSubmit={handleCreateBatch} className="flex gap-2">
          <input
            type="text"
            placeholder="New Lightbox Name"
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={creatingBatch}
            maxLength={255}
          />
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            disabled={creatingBatch || !newBatchName.trim()}
          >
            {creatingBatch ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      {/* List of Batches */}
      <h2 className="text-xl font-semibold mb-3">Your Existing Lightboxes</h2>
      {loading ? (
        <p>Loading your Lightboxes...</p>
      ) : batches.length === 0 ? (
        <p>You don't have any Lightboxes yet. Create one above!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <div key={batch.id} className="border p-4 rounded-lg shadow-md bg-white hover:shadow-lg transition-shadow duration-200">
              <Link href={`/batches/${batch.id}`} className="block">
                <h3 className="text-lg font-bold text-blue-700 hover:underline mb-2">{batch.name}</h3>
                <p className="text-sm text-gray-600">Items: {batch.item_count}</p>
                <p className="text-sm text-gray-600">Shared: {batch.is_shared ? 'Yes' : 'No'}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Created: {new Date(batch.creation_timestamp * 1000).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  Last Modified: {new Date(batch.last_modified_timestamp * 1000).toLocaleString()}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
