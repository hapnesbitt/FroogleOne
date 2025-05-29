// /home/www/froogle/src/app/page.tsx
'use client'; // This makes it a Client Component

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Batch {
  id: string;
  name: string;
  item_count: number;
  creation_timestamp: number;
  last_modified_timestamp: number;
  is_shared: boolean;
  share_token: string;
  user_id: string;
}

export default function DashboardPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBatchName, setNewBatchName] = useState('');
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const router = useRouter();

  const API_BASE_URL = 'http://localhost:5005/api/v1'; // Flask API URL

  // Function to fetch batches
  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/batches`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for sending session cookie
      });

      if (response.status === 401) {
        // If unauthorized, redirect to login
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setBatches(data.batches);
      } else {
        setError(data.message || 'Failed to fetch lightboxes.');
        console.error('Fetch batches error:', data.message);
      }
    } catch (err) {
      console.error('Network error fetching batches:', err);
      setError('Failed to connect to the backend. Is the Flask API running?');
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new batch
  const handleCreateBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsCreatingBatch(true);

    if (!newBatchName.trim()) {
      setError('Lightbox name cannot be empty.');
      setIsCreatingBatch(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newBatchName }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('Batch created:', data.batch);
        setNewBatchName(''); // Clear input
        fetchBatches(); // Refresh the list of batches
      } else {
        setError(data.message || 'Failed to create lightbox.');
        console.error('Create batch error:', data.message);
      }
    } catch (err) {
      console.error('Network error creating batch:', err);
      setError('Failed to connect to the backend during batch creation.');
    } finally {
      setIsCreatingBatch(false);
    }
  };


  // Fetch batches on component mount
  useEffect(() => {
    fetchBatches();
  }, []); // Empty dependency array means this runs once after initial render


  // Simple function to format timestamp
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    return date.toLocaleString(); // Uses user's locale for date/time
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-900 text-gray-100">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8">My Lightboxes</h1>
        <button
          onClick={() => {
            // For now, redirect to /logout. Later, replace with a proper logout API call.
            // Or you can create a specific logout button/link somewhere else
            // For a proper logout:
            fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
              .then(() => router.push('/login'))
              .catch(err => console.error('Logout failed:', err));
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Logout
        </button>
      </div>

      <div className="w-full max-w-5xl mt-8">
        <h2 className="text-2xl font-semibold mb-4">Create New Lightbox</h2>
        <form onSubmit={handleCreateBatch} className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
          <div className="mb-4">
            <label htmlFor="newBatchName" className="block text-gray-300 text-sm font-bold mb-2">
              Lightbox Name:
            </label>
            <input
              type="text"
              id="newBatchName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              required
              disabled={isCreatingBatch}
              placeholder="e.g., Vacation Photos 2024"
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            disabled={isCreatingBatch}
          >
            {isCreatingBatch ? 'Creating...' : 'Create Lightbox'}
          </button>
        </form>

        <h2 className="text-2xl font-semibold mb-4">Your Existing Lightboxes</h2>
        {loading ? (
          <p className="text-gray-400">Loading lightboxes...</p>
        ) : batches.length === 0 ? (
          <p className="text-gray-400">No lightboxes found. Create one above!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch) => (
              <div key={batch.id} className="bg-gray-800 p-6 rounded-lg shadow-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-blue-400 mb-2">{batch.name}</h3>
                  <p className="text-gray-300 text-sm">Items: {batch.item_count}</p>
                  <p className="text-gray-300 text-sm">Created: {formatTimestamp(batch.creation_timestamp)}</p>
                  {batch.last_modified_timestamp && batch.last_modified_timestamp !== batch.creation_timestamp && (
                    <p className="text-gray-300 text-sm">Modified: {formatTimestamp(batch.last_modified_timestamp)}</p>
                  )}
                  <p className="text-gray-300 text-sm">Shared: {batch.is_shared ? 'Yes' : 'No'}</p>
                </div>
                <div className="mt-4">
                  {/* Placeholder for "View Details" or "Upload" button */}
                  <button
                    onClick={() => router.push(`/batches/${batch.id}`)} // This will be the next page we create
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
