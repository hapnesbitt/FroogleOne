// /home/www/froogle/src/app/slideshow/view/[batch_id]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBatchDetails, ApiResponse, Batch, MediaItem } from '../../../../services/api'; // <-- CORRECTED PATH HERE (should be 4 levels up)

const IMAGE_DISPLAY_DURATION = 15000; // 15 seconds in milliseconds

export default function AuthenticatedSlideshowPage() {
  const params = useParams();
  const batchId = params.batch_id as string;
  const router = useRouter();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [mediaData, setMediaData] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // Default to playing

  // Refs for media elements to control them directly
  const imageRef = useRef<HTMLImageElement>(null); 
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Helper to advance to next media ---
  const goToNextMedia = useCallback(() => {
    // Stop all media elements cleanly before advancing
    if (videoRef.current) { 
        videoRef.current.pause(); 
        videoRef.current.currentTime = 0; // Reset video to start
    }
    if (audioRef.current) { 
        audioRef.current.pause(); 
        audioRef.current.currentTime = 0; // Reset audio to start
    }
    
    setCurrentMediaIndex(prevIndex => (prevIndex + 1) % mediaData.length);
  }, [mediaData.length]);

  // --- Fetch Slideshow Data ---
  useEffect(() => {
    if (!batchId) {
      setError("Batch ID is missing from the URL.");
      setLoading(false);
      return;
    }

    const fetchSlideshow = async () => {
      setLoading(true);
      setError(null);
      const response = await getBatchDetails(batchId); 

      if (response.success && response.batch) { 
        setBatch(response.batch); 
        const playableMedia = (response.batch.media_items || []).filter(item => 
          item.processing_status === 'completed' &&
          (item.mimetype?.startsWith('image/') || item.mimetype?.startsWith('video/') || item.mimetype?.startsWith('audio/')) &&
          !item.is_hidden && 
          item.web_url 
        );
        setMediaData(playableMedia);
        if (playableMedia.length === 0) {
          setError("No playable media found in this Lightbox for slideshow, or all items are hidden/processing.");
        }
        setCurrentMediaIndex(0); 
      } else {
        if (response.message?.includes("Authentication required") || response.message?.includes("No permission")) {
            router.push('/login'); 
        } else {
            setError(response.message || "Failed to load slideshow data. Check permissions or if batch exists.");
        }
        setBatch(null);
      }
      setLoading(false);
    };

    fetchSlideshow();
  }, [batchId, router]); 

  // --- Unified Playback Control and Auto-Advance Logic ---
  useEffect(() => {
    if (mediaData.length === 0 || loading || error) {
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      return;
    }

    const currentMedia = mediaData[currentMediaIndex];
    if (!currentMedia) return; 

    let imageTimer: NodeJS.Timeout | null = null;
    const currentVideoElement = videoRef.current;
    const currentAudioElement = audioRef.current;

    const handleMediaEnded = () => {
      goToNextMedia();
    };

    return () => {
      if (imageTimer) clearTimeout(imageTimer);
      if (currentVideoElement) {
        currentVideoElement.removeEventListener('ended', handleMediaEnded);
        currentVideoElement.pause();
        currentVideoElement.currentTime = 0; 
      }
      if (currentAudioElement) {
        currentAudioElement.removeEventListener('ended', handleMediaEnded);
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
      }
    };
  }, [currentMediaIndex, mediaData, isPlaying, loading, error, goToNextMedia]); 

  // --- Effect to trigger playback after a media element has been mounted/updated ---
  useEffect(() => {
    if (!isPlaying || !mediaData.length || loading || error) return;

    const currentMedia = mediaData[currentMediaIndex];
    if (!currentMedia) return;

    if (currentMedia.mimetype?.startsWith('video/') && videoRef.current) {
        videoRef.current.play().catch(e => {
            console.warn("Video autoplay prevented for authenticated view:", e);
        });
    } else if (currentMedia.mimetype?.startsWith('audio/') && audioRef.current) {
        audioRef.current.play().catch(e => {
            console.warn("Audio autoplay prevented for authenticated view:", e);
        });
    } else if (currentMedia.mimetype?.startsWith('image/')) {
        // For images, the timer is set up in the main useEffect.
    }
  }, [currentMediaIndex, isPlaying, mediaData, loading, error]);


  // --- Play/Pause Button Handler ---
  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  // --- User Controls (Next/Prev) ---
  const handleNext = () => {
    setIsPlaying(true); 
    goToNextMedia();
  };

  const handlePrev = () => {
    setIsPlaying(true); 
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setCurrentMediaIndex(prevIndex => (prevIndex - 1 + mediaData.length) % mediaData.length);
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault(); 
          handleNext();
          break;
        case 'ArrowLeft':
          event.preventDefault(); 
          handlePrev();
          break;
        case ' ': 
          event.preventDefault(); 
          handlePlayPause();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handlePlayPause]);


  // --- Render Logic ---
  if (loading) {
    return <div className="p-4 text-center text-xl font-semibold text-gray-700 dark:text-gray-300">Loading your slideshow...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center text-xl font-semibold bg-red-100 border border-red-400 rounded-lg">
        Error: {error}
        {error.includes("Authentication required") && (
            <p className="mt-2 text-blue-700">Please <Link href="/login" className="underline">log in</Link> to view this slideshow.</p>
        )}
      </div>
    );
  }

  if (!batch || mediaData.length === 0) {
    return (
      <div className="p-8 text-center text-xl font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        No playable media found in this Lightbox for slideshow, or all items are hidden/processing.
        <br/><br/>
        Please ensure the Lightbox contains supported media (images, videos, audio) and they are not hidden.
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
        {currentMedia?.mimetype?.startsWith('image/') && currentMedia.web_url && (
          <img
            ref={imageRef} 
            src={currentMedia.web_url} 
            alt={currentMedia.original_filename}
            className="max-w-full max-h-full object-contain"
          />
        )}
        {currentMedia?.mimetype?.startsWith('video/') && currentMedia.web_url && (
          <video
            ref={videoRef} 
            src={currentMedia.web_url} 
            className="max-w-full max-h-full object-contain"
            autoPlay={isPlaying} 
            controls 
            key={`video-${currentMedia.id}`} 
          />
        )}
        {currentMedia?.mimetype?.startsWith('audio/') && currentMedia.web_url && (
          <audio
            ref={audioRef} 
            src={currentMedia.web_url} 
            className="w-full px-4"
            autoPlay={isPlaying} 
            controls 
            key={`audio-${currentMedia.id}`}
          />
        )}
        
        {/* Fallback for unsupported/non-displayable types or missing URLs */}
        {(!currentMedia?.web_url || (!currentMedia?.mimetype?.startsWith('image/') && !currentMedia?.mimetype?.startsWith('video/') && !currentMedia?.mimetype?.startsWith('audio/'))) && (
            <div className="text-center text-gray-400 p-4">
                <p>Unable to display this media type: {currentMedia?.mimetype || 'unknown'}</p>
                <p>File: {currentMedia?.original_filename}</p>
                {currentMedia?.download_url && ( 
                    <a href={currentMedia.download_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mt-2 inline-block">
                        Download File
                    </a>
                )}
            </div>
        )}
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
      <Link href={`/batches/${batchId}`} className="text-blue-400 hover:underline text-sm mt-4">← Back to Lightbox Details</Link>
    </div>
  );
}
