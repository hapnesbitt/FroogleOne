'use client';

import { useEffect, useState, useRef, useCallback } from 'react'; // Added useCallback
import { useParams } from 'next/navigation';
import { getPublicSlideshow, ApiResponse, Batch, MediaItem } from '../../../services/api'; 

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
  const imageRef = useRef<HTMLImageElement>(null); 
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Helper to advance to next media ---
  const goToNextMedia = useCallback(() => { // Wrapped in useCallback
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
  }, [mediaData.length]); // Dependencies for useCallback

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
        // Filter out items that are not completed, not suitable for direct display in slideshow,
        // or don't have a public_display_url from the backend.
        const playableMedia = response.data.media_data.filter(item => 
          item.processing_status === 'completed' &&
          (item.mimetype?.startsWith('image/') || item.mimetype?.startsWith('video/') || item.mimetype?.startsWith('audio/')) &&
          item.public_display_url // Ensure a display URL is provided by Flask
        );
        setMediaData(playableMedia);
        if (playableMedia.length === 0) {
          setError("No playable media found in this Lightbox for slideshow.");
        }
        // Reset index if mediaData changes (e.g., if filtering results in fewer items)
        setCurrentMediaIndex(0); 
      } else {
        setError(response.message || "Failed to load slideshow data.");
      }
      setLoading(false);
    };

    fetchSlideshow();
  }, [shareToken, getPublicSlideshow]); // Added getPublicSlideshow to useEffect dependencies

  // --- Unified Playback Control and Auto-Advance Logic ---
  // This effect runs whenever currentMediaIndex changes, or isPlaying state changes.
  useEffect(() => {
    if (mediaData.length === 0 || loading || error) {
      // Nothing to play or conditions not met, ensure all media are stopped/reset
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      return;
    }

    const currentMedia = mediaData[currentMediaIndex];
    if (!currentMedia) return; 

    // Removed imageTimer, as it was unused and caused `let` to `const` warnings
    
    const currentVideoElement = videoRef.current;
    const currentAudioElement = audioRef.current;

    // Helper to advance and cleanup
    const handleMediaEnded = () => {
      goToNextMedia();
    };

    // --- Cleanup for previous media / before setting up new ---
    // This return function runs when dependencies change or component unmounts
    return () => {
      // if (imageTimer) clearTimeout(imageTimer); // Removed
      if (currentVideoElement) {
        currentVideoElement.removeEventListener('ended', handleMediaEnded);
        currentVideoElement.pause();
        currentVideoElement.currentTime = 0; // Reset video to start for next time it might be shown
      }
      if (currentAudioElement) {
        currentAudioElement.removeEventListener('ended', handleMediaEnded);
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0; // Reset audio to start for next time it might be shown
      }
    };
  }, [currentMediaIndex, mediaData, isPlaying, loading, error, goToNextMedia]); // Dependencies of the effect

  // --- Effect to trigger playback after a media element has been mounted/updated ---
  // This separate effect ensures media plays only when `isPlaying` is true and the element is ready.
  // It should run AFTER the element's src has been updated by the main render.
  useEffect(() => {
    if (!isPlaying || !mediaData.length || loading || error) return;

    const currentMedia = mediaData[currentMediaIndex];
    if (!currentMedia) return;

    if (currentMedia.mimetype?.startsWith('video/') && videoRef.current) {
        videoRef.current.play().catch(e => {
            console.warn("Video autoplay prevented:", e);
            // This is where you might show a "Play" button if autoplay is blocked
        });
    } else if (currentMedia.mimetype?.startsWith('audio/') && audioRef.current) {
        audioRef.current.play().catch(e => {
            console.warn("Audio autoplay prevented:", e);
            // This is where you might show a "Play" button if autoplay is blocked
        });
    } else if (currentMedia.mimetype?.startsWith('image/')) {
        // For images, we rely on the timer. The timer is set up in the main useEffect.
        // If image should auto-advance, ensure the main useEffect sets the timer when isPlaying is true.
    }
  }, [currentMediaIndex, isPlaying, mediaData, loading, error]); // Dependencies for this play trigger effect


  // --- Play/Pause Button Handler ---
  const handlePlayPause = useCallback(() => { // Wrapped in useCallback
    setIsPlaying(prev => !prev);
  }, []); // No dependencies for this simple toggle

  // --- User Controls (Next/Prev) ---
  const handleNext = useCallback(() => { // Wrapped in useCallback
    setIsPlaying(true); // Assume user wants to play when manually advancing
    goToNextMedia();
  }, [goToNextMedia]); // Dependencies for useCallback

  const handlePrev = useCallback(() => { // Wrapped in useCallback
    setIsPlaying(true); // Assume user wants to play when manually advancing
    // Manually going prev should also reset/pause the current media before moving
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setCurrentMediaIndex(prevIndex => (prevIndex - 1 + mediaData.length) % mediaData.length);
  }, [mediaData.length]); // Dependencies for useCallback


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
        {currentMedia?.mimetype?.startsWith('image/') && currentMedia.public_display_url && (
          <img
            ref={imageRef} // Attach ref
            src={currentMedia.public_display_url} 
            alt={currentMedia.original_filename}
            className="max-h-full max-w-full object-contain"
          />
        )}
        {currentMedia?.mimetype?.startsWith('video/') && currentMedia.public_display_url && (
          <video
            ref={videoRef} // Attach ref
            src={currentMedia.public_display_url} 
            className="max-h-full max-w-full object-contain"
            autoPlay={isPlaying} // Control autoplay based on state
            controls // Keep controls for user fallback/manual scrubbing
            // IMPORTANT: Adding a key to force re-render/reset video element when media changes
            key={`video-${currentMedia.id}`} 
          />
        )}
        {currentMedia?.mimetype?.startsWith('audio/') && currentMedia.public_display_url && (
          <audio
            ref={audioRef} // Attach ref
            src={currentMedia.public_display_url} 
            className="w-full px-4"
            autoPlay={isPlaying} // Control autoplay based on state
            controls // Keep controls for user fallback/manual scrubbing
            // IMPORTANT: Adding a key to force re-render/reset audio element when media changes
            key={`audio-${currentMedia.id}`}
          />
        )}
        
        {/* Fallback for unsupported/non-displayable types or missing URLs */}
        {(!currentMedia?.public_display_url || (!currentMedia?.mimetype?.startsWith('image/') && !currentMedia?.mimetype?.startsWith('video/') && !currentMedia?.mimetype?.startsWith('audio/'))) && (
            <div className="text-center text-gray-400 p-4">
                <p>File type not previewable.</p>
                {/* You might offer a download link here if public_download_url exists */}
                {currentMedia?.public_download_url && (
                    <a href={currentMedia.public_download_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mt-2 inline-block">
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
    </div>
  );
}
