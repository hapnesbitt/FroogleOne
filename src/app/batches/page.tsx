// /home/www/froogle/src/app/batches/page.tsx
'use client'; 

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
} from '../../services/api'; // <-- CORRECTED PATH HERE (removed one ../)

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
      if (response.success && response.isLoggedIn !== undefined) { 
        setIsLoggedIn(response.isLoggedIn); 
        setCurrentUser(response.user || null); 
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
        setLoading(false);
      }
      return;
    }

    const fetchBatches = async () => {
      setLoading(true);
      setError(null);
      const response = await getBatches(); 
      if (response.success && response.batches) { 
        setBatches(response.batches); 
      } else {
        setError(response.message || 'Failed to load batches.');
        setBatches([]);
      }
      setLoading(false);
    };

    fetchBatches();
  }, [isLoggedIn, authLoading]); 

  // --- Handlers ---
  const handleCreateBatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) {
      setError('Lightbox name cannot be empty.');
      return;
    }

    setCreatingBatch(true);
    setError(null);
    const response = await createBatch(newBatchName.trim()); 
    if (response.success && response.batch) { 
      setNewBatchName(''); 
      setBatches(prevBatches =>
        [...prevBatches, response.batch!].sort((a, b) => (b.creation_timestamp || 0) - (a.creation_timestamp || 0)) 
      );
    } else {
      setError(response.message || 'Failed to create Lightbox.');
    }
    setCreatingBatch(false);
  };

  const handleTestLogin = async () => {
    setError(null);
    const response = await login('ross', 'password'); 
    if (response.success) {
      alert('Logged in as ross!');
      setIsLoggedIn(true); 
      setCurrentUser(response.user || null); 
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
      setBatches([]); 
    } else {
      setError(response.message || 'Logout failed.');
    }
  };

  // --- Render Logic ---
  if (authLoading) {
    return (
        <div className="p-8 text-center text-xl font-semibold text-gray-700">
            <p>Checking authentication status...</p>
        </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen-centered bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm border border-gray-200">
          <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">Login Required</h1>
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200 ease-in-out disabled:opacity-50"
            disabled={loading || creatingBatch}
          >
            Login as Ross (Test)
          </button>
          <p className="text-center text-gray-600 text-sm mt-4">
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-800">
                Register here
              </Link>
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 border-gray-300">
        <h1 className="text-3xl font-extrabold text-gray-900">Your Lightboxes</h1>
        <div className="text-right mt-4 md:mt-0">
          {currentUser && (
            <p className="text-lg text-gray-700">Logged in as: <span className="font-semibold">{currentUser.username}</span></p>
          )}
          <button
            onClick={handleLogout}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Create New Batch Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Lightbox</h2>
        <form onSubmit={handleCreateBatch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter Lightbox name"
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={creatingBatch}
            maxLength={255}
            required
          />
          <button
            type="submit"
            className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors"
            disabled={creatingBatch || !newBatchName.trim()}
          >
            {creatingBatch ? 'Creating...' : 'Create Lightbox'}
          </button>
        </form>
      </div>

      {/* List of Batches */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Existing Lightboxes ({batches.length})</h2>
      {loading ? (
        <p className="text-gray-600">Loading your Lightboxes...</p>
      ) : batches.length === 0 ? (
        <p className="text-gray-600">You don't have any Lightboxes yet. Create one above!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <div key={batch.id} className="border border-gray-200 p-5 rounded-lg shadow-md bg-white hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between">
              <Link href={`/batches/${batch.id}`} className="block mb-3">
                <h3 className="text-xl font-bold text-blue-700 hover:text-blue-800 break-words mb-2">{batch.name}</h3>
                <p className="text-sm text-gray-600">Items: {batch.item_count}</p>
                <p className="text-sm text-gray-600">Shared: <span className={`${batch.is_shared ? 'text-green-600' : 'text-red-600'}`}>{batch.is_shared ? 'Yes' : 'No'}</span></p>
                <p className="text-xs text-gray-500 mt-2">
                  Created: {new Date(batch.creation_timestamp * 1000).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  Last Modified: {new Date(batch.last_modified_timestamp * 1000).toLocaleString()}
                </p>
              </Link>
              {/* Authenticated Slideshow Link for the Owner */}
              {batch.playable_media_count !== undefined && batch.playable_media_count > 0 && (
                <Link 
                  href={`/slideshow/view/${batch.id}`} 
                  className="mt-3 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md text-center hover:bg-blue-700 transition-colors inline-flex items-center justify-center space-x-2"
                >
                  <span>Play My Slideshow</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
