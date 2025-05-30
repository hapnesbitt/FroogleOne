// /home/www/froogle/src/app/slideshow/[share_token]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getPublicSlideshow, ApiResponse, Batch, MediaItem, url_for_api_base } from '../../../services/api'; // ADDED url_for_api_base

const IMAGE_DISPLAY_DURATION = 15000; // 15 seconds in milliseconds

export default function PublicSlideshowPage() {
  const params = useParams();
  const shareToken = params.share_token as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [mediaData, setMediaData] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // Default to playing

  // Refs for media elements to control them directly
  const imageRef = useRef<HTMLImageElement>(null); // Ref for image element
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Helper to advance to next media ---
  const goToNextMedia = useCallback(() => {
    setCurrentMediaIndex(prevIndex => (prevIndex + 1) % mediaData.length);
  }, [mediaData.length]);

  // --- Fetch Slideshow Data ---
  useEffect(() => {
    if (!shareToken) {
      setError("Share token is missing from the URL.");
      setLoading(false);
      return;
    }

    const fetchSlideshow = async () => {
      setLoading(true);
      setError(null);
      const response: ApiResponse<{ batch: Batch; media_data: MediaItem[] }> = await getPublicSlideshow(shareToken);

      if (response.success && response.data) {
        setBatch(response.data.batch);
        // Filter out blobs/unsupported types that Flask might send for public_batch_view (if any)
        // For slideshow, we only want actual playable media that are completed
        const playableMedia = response.data.media_data.filter(item => 
          item.processing_status === 'completed' &&
          (item.mimetype.startsWith('image/') || item.mimetype.startsWith('video/') || item.mimetype.startsWith('audio/'))
        );
        setMediaData(playableMedia);
        if (playableMedia.length === 0) {
          setError("No playable media found in this Lightbox for slideshow.");
        }
      } else {
        setError(response.message || "Failed to load slideshow data.");
      }
      setLoading(false);
    };

    fetchSlideshow();
  }, [shareToken]);

  // --- Smart Playback Logic (Images, Video, Audio) ---
  useEffect(() => {
    // Clear any previous timers/listeners
    let imageTimer: NodeJS.Timeout | null = null;
    const currentVideoElement = videoRef.current;
    const currentAudioElement = audioRef.current;

    const handleMediaEnd = () => {
      goToNextMedia(); // Auto-advance on media end
    };

    // --- Cleanup for current media ---
    // This runs before setting up new listeners or when component unmounts
    return () => {
      if (imageTimer) clearTimeout(imageTimer);
      if (currentVideoElement) {
        currentVideoElement.removeEventListener('ended', handleMediaEnd);
        currentVideoElement.pause();
        currentVideoElement.currentTime = 0; // Reset playback position
      }
      if (currentAudioElement) {
        currentAudioElement.removeEventListener('ended', handleMediaEnd);
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0; // Reset playback position
      }
    };
  }, [currentMediaIndex, mediaData, goToNextMedia]); // Dependencies: changes when media, index, or goToNextMedia changes

  // --- Play/Pause Control Effect (separate from auto-advance logic) ---
  useEffect(() => {
    // This effect ensures media elements respond to isPlaying state changes
    if (mediaData.length === 0 || loading || error) return;

    const currentMedia = mediaData[currentMediaIndex];
    if (!currentMedia) return;

    if (currentMedia.mimetype.startsWith('video/') && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(e => console.error("Video play failed:", e));
      } else {
        videoRef.current.pause();
      }
    } else if (currentMedia.mimetype.startsWith('audio/') && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    } else if (currentMedia.mimetype.startsWith('image/')) {
      // Images don't have play/pause, but we start/stop auto-advance timer here
      if (isPlaying) {
        // Restart image timer if playing
        let imageTimer = setTimeout(goToNextMedia, IMAGE_DISPLAY_DURATION);
        return () => clearTimeout(imageTimer); // Cleanup this specific timer
      } else {
        // If paused, the main useEffect cleanup (above) will clear its timer implicitly
      }
    }
  }, [isPlaying, currentMediaIndex, mediaData, loading, error, goToNextMedia]);


  // --- Play/Pause Button Handler ---
  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  // --- User Controls (Next/Prev) ---
  const handleNext = () => {
    setIsPlaying(true); // Assume user wants to play when manually advancing
    goToNextMedia();
  };

  const handlePrev = () => {
    setIsPlaying(true); // Assume user wants to play when manually advancing
    setCurrentMediaIndex(prevIndex => (prevIndex - 1 + mediaData.length) % mediaData.length);
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault(); // Prevent page scroll
          handleNext();
          break;
        case 'ArrowLeft':
          event.preventDefault(); // Prevent page scroll
          handlePrev();
          break;
        case ' ': // Spacebar for play/pause
          event.preventDefault(); // Prevent page scroll
          handlePlayPause();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handlePlayPause]);


  // --- Render Logic ---
  if (loading) {
    return <div className="p-4 text-center text-xl font-semibold text-gray-700 dark:text-gray-300">Loading slideshow...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center text-xl font-semibold bg-red-100 border border-red-400 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!batch || mediaData.length === 0) {
    return (
      <div className="p-8 text-center text-xl font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        No slideshow available or no playable media found in this Lightbox.
        <br/><br/>
        Please ensure the Lightbox is shared and contains supported media (images, videos, audio).
      </div>
    );
  }

  const currentMedia = mediaData[currentMediaIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4 mt-8">{batch.name} Slideshow</h1>
      <p className="text-lg mb-2">
        {currentMediaIndex + 1} / {mediaData.length} - {currentMedia?.original_filename}
      </p>

      <div className="relative w-full max-w-5xl h-[70vh] flex items-center justify-center bg-black rounded-lg overflow-hidden shadow-2xl">
        {/* The actual media elements */}
        <img
          ref={imageRef} // Attach ref
          src={`${url_for_api_base}/media/${currentMedia?.id}/download`} // CORRECTED: Use API for direct download
          alt={currentMedia?.original_filename}
          className="max-h-full max-w-full object-contain"
          style={{ display: currentMedia?.mimetype.startsWith('image/') ? 'block' : 'none' }} // Show/hide based on type
        />
        <video
          ref={videoRef} // Attach ref
          src={`${url_for_api_base}/media/${currentMedia?.id}/download`} // CORRECTED: Use API for direct download
          className="max-h-full max-w-full object-contain"
          autoPlay={isPlaying} // Control autoplay based on state
          controls // Keep controls for user fallback/manual scrubbing
          style={{ display: currentMedia?.mimetype.startsWith('video/') ? 'block' : 'none' }} // Show/hide based on type
        />
        <audio
          ref={audioRef} // Attach ref
          src={`${url_for_api_base}/media/${currentMedia?.id}/download`} // CORRECTED: Use API for direct download
          className="w-full px-4"
          autoPlay={isPlaying} // Control autoplay based on state
          controls // Keep controls for user fallback/manual scrubbing
          style={{ display: currentMedia?.mimetype.startsWith('audio/') ? 'block' : 'none' }} // Show/hide based on type
        />
        
        {/* You can add a loading spinner here based on your 'isLoadingMedia' state if you re-introduce it */}
        {/* Example: { isLoadingMedia && <div className="absolute ...spinner styles..."></div> } */}
      </div>

      <div className="flex space-x-6 mt-6 mb-8">
        <button onClick={handlePrev} className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-xl font-semibold">
          Previous
        </button>
        <button onClick={handlePlayPause} className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-200 text-xl font-semibold">
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={handleNext} className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-xl font-semibold">
          Next
        </button>
      </div>
    </div>
  );
}
