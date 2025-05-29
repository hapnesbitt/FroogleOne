// /home/www/froogle/src/app/batches/[batch_id]/page.tsx
'use client'; // This component will run on the client-side

import { useEffect, useState } from 'react';
// IMPORTANT: Path for this file is correct: two levels up to 'batches', then one more to 'app', then 'services'
import { getBatchDetails, Batch, MediaItem, ApiResponse } from '../../../services/api'; 
import { useParams } from 'next/navigation'; // For App Router

export default function BatchDetailsPage() {
  const params = useParams();
  const batchId = params.batch_id as string; // Ensure it's a string
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) {
      setLoading(false);
      setError("Batch ID is missing.");
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      const response: ApiResponse<{ batch: Batch }> = await getBatchDetails(batchId);
      if (response.success && response.data) {
        setBatch(response.data.batch);
      } else {
        setError(response.message || 'Failed to load batch details.');
      }
      setLoading(false);
    };

    fetchDetails();
  }, [batchId]);

  if (loading) {
    return <div className="p-4">Loading Lightbox details...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (!batch) {
    return <div className="p-4">Lightbox not found.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Lightbox: {batch.name}</h1>
      <p>Owner: {batch.user_id}</p>
      <p>Created: {new Date(batch.creation_timestamp * 1000).toLocaleString()}</p>
      <p>Last Modified: {new Date(batch.last_modified_timestamp * 1000).toLocaleString()}</p>
      <p>Shared: {batch.is_shared ? 'Yes' : 'No'}</p>
      {batch.is_shared && batch.share_token && (
        <p>Share Token: {batch.share_token}</p>
      )}

      <h2 className="text-xl font-semibold mt-6 mb-3">Media Items ({batch.item_count})</h2>
      {batch.media_items && batch.media_items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batch.media_items.map((media) => (
            <div key={media.id} className="border p-4 rounded shadow">
              <h3 className="font-medium">{media.original_filename}</h3>
              <p className="text-sm text-gray-600">Type: {media.mimetype}</p>
              <p className="text-sm text-gray-600">Status: {media.processing_status}</p>
              <p className="text-sm text-gray-600">Hidden: {media.is_hidden ? 'Yes' : 'No'}</p>
              <p className="text-sm text-gray-600">Liked: {media.is_liked ? 'Yes' : 'No'}</p>
              {/* For web_url, consider how your static files are served by Nginx or if Flask routes handle all media.
                  If your Nginx serves static files, you might use:
                  <img src={`/static/uploads/${media.filepath}`} ... />
                  Otherwise, media.web_url (which points back to Flask API) is correct.
              */}
              {media.web_url && media.mimetype.startsWith('image/') && (
                <img src={media.web_url} alt={media.original_filename} className="mt-2 max-w-full h-auto" />
              )}
              {media.web_url && media.mimetype.startsWith('video/') && (
                <video controls src={media.web_url} className="mt-2 max-w-full h-auto"></video>
              )}
              {media.web_url && media.mimetype.startsWith('audio/') && (
                <audio controls src={media.web_url} className="mt-2 w-full"></audio>
              )}
              {media.download_url && (
                <a href={media.download_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-2 inline-block">Download</a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No media items in this Lightbox.</p>
      )}
    </div>
  );
}
