// /home/www/froogle/src/app/slideshow/[share_token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPublicSlideshow, ApiResponse, Batch } from '../../../services/api'; // Adjust path

export default function PublicSlideshowPage() {
  const params = useParams();
  const shareToken = params.share_token as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [mediaData, setMediaData] = useState<any[]>([]); // Simplified for now
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  useEffect(() => {
    if (!shareToken) {
      setError("Share token is missing from the URL.");
      setLoading(false);
      return;
    }

    const fetchSlideshow = async () => {
      setLoading(true);
      setError(null);
      const response: ApiResponse<{ batch: Batch; media_data: any[] }> = await getPublicSlideshow(shareToken);

      if (response.success && response.data) {
        setBatch(response.data.batch);
        setMediaData(response.data.media_data);
        if (response.data.media_data.length === 0) {
          setError("No playable media found in this Lightbox for slideshow.");
        }
      } else {
        setError(response.message || "Failed to load slideshow data.");
      }
      setLoading(false);
    };

    fetchSlideshow();
  }, [shareToken]);

  const handleNext = () => {
    setCurrentMediaIndex((prevIndex) => (prevIndex + 1) % mediaData.length);
  };

  const handlePrev = () => {
    setCurrentMediaIndex((prevIndex) => (prevIndex - 1 + mediaData.length) % mediaData.length);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading slideshow...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center">Error: {error}</div>;
  }

  if (!batch || mediaData.length === 0) {
    return <div className="p-4 text-center">No slideshow available for this Lightbox.</div>;
  }

  const currentMedia = mediaData[currentMediaIndex];

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4">{batch.name} Slideshow</h1>
      <div className="relative w-full max-w-4xl max-h-[80vh] flex items-center justify-center bg-black">
        {currentMedia && (
          currentMedia.mimetype.startsWith('image/') ? (
            <img
              src={`http://localhost:5005/${currentMedia.filepath_segment}`} // Frontend constructs path for static files
              alt={currentMedia.original_filename}
              className="max-h-full max-w-full object-contain"
            />
          ) : currentMedia.mimetype.startsWith('video/') ? (
            <video
              src={`http://localhost:5005/${currentMedia.filepath_segment}`} // Frontend constructs path for static files
              controls
              className="max-h-full max-w-full object-contain"
            />
          ) : currentMedia.mimetype.startsWith('audio/') ? (
            <audio
              src={`http://localhost:5005/${currentMedia.filepath_segment}`} // Frontend constructs path for static files
              controls
              className="w-full"
            />
          ) : (
            <p>Unsupported media type: {currentMedia.mimetype}</p>
          )
        )}
      </div>
      <div className="flex space-x-4 mt-4">
        <button onClick={handlePrev} className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600">Previous</button>
        <button onClick={handleNext} className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600">Next</button>
      </div>
      <p className="mt-2 text-sm">
        {currentMediaIndex + 1} / {mediaData.length} - {currentMedia?.original_filename}
      </p>
    </div>
  );
}
