// /home/www/froogle/src/app/batches/[batch_id]/page.tsx
'use client'; 

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link'; 
import { 
  getBatchDetails, 
  deleteBatch, 
  renameBatch, 
  toggleShareBatch, 
  toggleMediaHidden, 
  toggleMediaLiked, 
  deleteMedia,
  uploadFiles, 
  ApiResponse, 
  Batch, 
  MediaItem 
} from '../../../services/api'; // Corrected path

export default function BatchDetailsPage() {
  const params = useParams();
  const batchId = params.batch_id as string; 
  const router = useRouter(); 

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [isSharing, setIsSharing] = useState(false); 
  const [toggleShareError, setToggleShareError] = useState<string | null>(null);

  // --- Upload Form States ---
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'media' | 'import_zip' | 'blob_storage'>('media');
  const [fileDescription, setFileDescription] = useState('');


  // --- Fetch Batch Details ---
  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    const response = await getBatchDetails(batchId); 
    
    if (response.success && response.batch) { 
      setBatch(response.batch); 
      setNewBatchName(response.batch.name); 
    } else {
      setError(response.message || 'Failed to load Lightbox details.');
      setBatch(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!batchId) {
      setLoading(false);
      setError("Batch ID is missing.");
      return;
    }
    fetchDetails();
  }, [batchId]);


  // --- Handlers for Batch Actions ---

  const handleDeleteBatch = async () => {
    if (!batchId || !confirm(`Are you sure you want to delete Lightbox "${batch?.name || batchId}" and all its contents? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    const response: ApiResponse = await deleteBatch(batchId); 
    if (response.success) {
      alert(response.message || 'Lightbox deleted successfully!');
      router.push('/batches'); 
    } else {
      setError(response.message || 'Failed to delete Lightbox.');
    }
    setIsDeleting(false);
  };

  const handleRenameBatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) {
      setError('New name cannot be empty.');
      return;
    }
    if (newBatchName.trim() === batch?.name) {
      alert('Name is the same, no change needed.');
      return;
    }
    setIsRenaming(true);
    setError(null);
    const response = await renameBatch(batchId, newBatchName.trim()); 
    if (response.success) {
      setBatch(prevBatch => prevBatch ? { ...prevBatch, name: newBatchName.trim(), last_modified_timestamp: Date.now() / 1000 } : null);
      alert(response.message || 'Lightbox renamed successfully!');
    } else {
      setError(response.message || 'Failed to rename Lightbox.');
    }
    setIsRenaming(false);
  };

  const handleToggleShare = async () => {
    if (!batchId) return;

    setIsSharing(true);
    setToggleShareError(null);
    const response = await toggleShareBatch(batchId); 

    if (response.success && response.is_shared !== undefined) { 
      setBatch(prevBatch => prevBatch ? { 
        ...prevBatch, 
        is_shared: response.is_shared, 
        share_token: response.share_token || null,
        public_share_url: response.public_share_url,
        public_slideshow_url: response.public_slideshow_url,
        last_modified_timestamp: Date.now() / 1000 
      } : null);
      alert(response.message);
    } else {
      setToggleShareError(response.message || 'Failed to toggle share status.');
    }
    setIsSharing(false);
  };

  // --- Handlers for Media Item Actions ---

  const handleToggleMediaHidden = async (mediaId: string) => {
    setError(null);
    const response = await toggleMediaHidden(mediaId); 
    if (response.success && response.is_hidden !== undefined) { 
      setBatch(prevBatch => {
        if (!prevBatch) return null;
        const newMediaItems = prevBatch.media_items?.map(item =>
          item.id === mediaId ? { ...item, is_hidden: response.is_hidden } : item
        );
        const updatedBatch = { ...prevBatch, media_items: newMediaItems, last_modified_timestamp: Date.now() / 1000 };
        updatedBatch.playable_media_count = (newMediaItems || []).filter(item => 
          item.processing_status === 'completed' && 
          (item.mimetype?.startsWith('image/') || item.mimetype?.startsWith('video/') || item.mimetype?.startsWith('audio/')) &&
          !item.is_hidden
        ).length;
        return updatedBatch;
      });
    } else {
      setError(response.message || 'Failed to toggle media visibility.');
    }
  };

  const handleToggleMediaLiked = async (mediaId: string) => {
    setError(null);
    const response = await toggleMediaLiked(mediaId); 
    if (response.success && response.is_liked !== undefined) { 
      setBatch(prevBatch => prevBatch ? {
        ...prevBatch,
        media_items: prevBatch.media_items?.map(item =>
          item.id === mediaId ? { ...item, is_liked: response.is_liked } : item
        ),
        last_modified_timestamp: Date.now() / 1000
      } : null);
    } else {
      setError(response.message || 'Failed to toggle media liked status.');
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this media item?')) return;
    setError(null);
    const response: ApiResponse = await deleteMedia(mediaId);
    if (response.success) {
      setBatch(prevBatch => {
        if (!prevBatch) return null;
        const newMediaItems = prevBatch.media_items?.filter(item => item.id !== mediaId);
        const updatedBatch = {
          ...prevBatch,
          media_items: newMediaItems,
          item_count: (prevBatch.item_count || 0) - 1, 
          last_modified_timestamp: Date.now() / 1000,
        };
        updatedBatch.playable_media_count = (newMediaItems || []).filter(item => 
            item.processing_status === 'completed' && 
            (item.mimetype?.startsWith('image/') || item.mimetype?.startsWith('video/') || item.mimetype?.startsWith('audio/')) &&
            !item.is_hidden
        ).length;
        return updatedBatch;
      });
      alert(response.message || 'Media item deleted successfully!');
    } else {
      setError(response.message || 'Failed to delete media item.');
    }
  };

  // --- Upload Form Handlers ---

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
    setUploadError(null);
    setUploadSuccessMessage(null);
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadError("Please select files to upload.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccessMessage(null);

    const filesArray = Array.from(selectedFiles);
    // Corrected `uploadFiles` signature for new api.ts:
    // uploadFiles(filesArray, uploadType, existingBatchId, newBatchName, description)
    const response = await uploadFiles(filesArray, uploadType, batchId, undefined, fileDescription); 

    if (response.success) {
      setUploadSuccessMessage(response.message || 'Files uploaded successfully!');
      setSelectedFiles(null); 
      setFileDescription(''); 
      fetchDetails(); // Re-fetch batch details to show new media items and update counts
    } else {
      setUploadError(response.message || 'File upload failed.');
    }
    setUploading(false);
  };

  // --- Render Logic ---
  if (loading) {
    return (
        <div className="p-8 text-center text-xl font-semibold text-gray-700">
            <p>Loading Lightbox details...</p>
        </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-500 text-center text-xl font-semibold bg-red-100 border border-red-400 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!batch) {
    return <div className="p-8 text-center text-xl font-semibold text-gray-700">Lightbox not found or not accessible.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 border-gray-300">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 break-words">
            {batch.name}
          </h1>
          <p className="text-gray-600">Owner: {batch.user_id}</p>
          <p className="text-gray-600">Created: {new Date(batch.creation_timestamp * 1000).toLocaleString()}</p>
          <p className="text-gray-600">Last Modified: {new Date(batch.last_modified_timestamp * 1000).toLocaleString()}</p>
        </div>
        <div className="flex flex-col md:flex-row items-end md:items-center mt-4 md:mt-0 space-y-2 md:space-y-0 md:space-x-3">
          <Link href="/batches" className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
            ← Back to Lightboxes
          </Link>
          <button 
            onClick={handleDeleteBatch} 
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? 'Deleting...' : 'Delete Lightbox'}
          </button>
        </div>
      </div>

      {/* Rename Batch Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Rename Lightbox</h2>
        <form onSubmit={handleRenameBatch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRenaming}
            maxLength={255}
          />
          <button
            type="submit"
            disabled={isRenaming || !newBatchName.trim() || newBatchName.trim() === batch.name}
            className="px-5 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
          >
            {isRenaming ? 'Renaming...' : 'Rename'}
          </button>
        </form>
      </div>

      {/* Play Slideshow (for owner) */}
      {/* Updated to link to the new authenticated slideshow page */}
      {/* Added undefined check for playable_media_count, though Flask should always provide it */}
      {batch.playable_media_count !== undefined && batch.playable_media_count > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200 flex justify-center">
              <Link 
                href={`/slideshow/view/${batch.id}`} 
                className="px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
              >
                <span>Play My Slideshow</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
              </Link>
          </div>
      )}


      {/* Share Links Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Public Sharing Options</h2>
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-700">Current Share Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${batch.is_shared ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {batch.is_shared ? 'Public' : 'Private'}
            </span>
            <button
              onClick={handleToggleShare}
              disabled={isSharing}
              className={`px-4 py-2 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 
                ${batch.is_shared ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSharing ? 'Updating...' : batch.is_shared ? 'Make Private' : 'Make Public'}
            </button>
          </div>

          {toggleShareError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md relative text-sm" role="alert">
              Error: {toggleShareError}
            </div>
          )}

          {batch.is_shared && (
            <div className="mt-4 border-t pt-4">
              <p className="text-gray-700 font-medium mb-2">Links for Public Sharing:</p>
              {batch.public_share_url && (
                <div className="mb-2">
                  <span className="block text-sm text-gray-600">Public Gallery Link:</span>
                  <a 
                    href={batch.public_share_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline text-sm break-all font-mono"
                  >
                    {batch.public_share_url}
                  </a>
                </div>
              )}
              {batch.public_slideshow_url && (
                <div>
                  <span className="block text-sm text-gray-600">Public Slideshow Link:</span>
                  <a 
                    href={batch.public_slideshow_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-green-600 hover:underline text-sm break-all font-mono"
                  >
                    {batch.public_slideshow_url}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Files Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload New Files to This Lightbox</h2>
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label htmlFor="files" className="block text-gray-700 text-sm font-semibold mb-2">
              Select Files (Images, Videos, Audio, Zips, PDFs, etc.)
            </label>
            <input
              type="file"
              id="files"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              disabled={uploading}
              required
            />
          </div>
          <div>
            <label htmlFor="uploadType" className="block text-gray-700 text-sm font-semibold mb-2">
              Upload Type
            </label>
            <select
              id="uploadType"
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as 'media' | 'import_zip' | 'blob_storage')}
              className="block w-full p-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={uploading}
            >
              <option value="media">Media (Image/Video/Audio - processed)</option>
              <option value="blob_storage">Blob Storage (Any file type - stored as-is)</option>
              <option value="import_zip">Import Zip Archive (ZIP files only - contents processed)</option>
            </select>
          </div>
          <div>
            <label htmlFor="description" className="block text-gray-700 text-sm font-semibold mb-2">
              Description (for all selected files, if applicable)
            </label>
            <textarea
              id="description"
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              rows={2}
              className="block w-full p-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Photos from vacation"
              disabled={uploading}
            ></textarea>
          </div>
          <button
            type="submit"
            disabled={uploading || !selectedFiles || selectedFiles.length === 0}
            className="w-full px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </form>
        {uploadError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mt-4" role="alert">
            <strong className="font-bold">Upload Error:</strong>
            <span className="block sm:inline"> {uploadError}</span>
          </div>
        )}
        {uploadSuccessMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative mt-4" role="alert">
            <strong className="font-bold">Upload Success:</strong>
            <span className="block sm:inline"> {uploadSuccessMessage}</span>
          </div>
        )}
      </div>


      {/* Media Items List */}
      <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-4">Media Items ({batch.item_count})</h2>
      {batch.media_items && batch.media_items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {batch.media_items.map((media) => (
            <div key={media.id} className="border border-gray-200 p-4 rounded-lg shadow-sm bg-white flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 text-lg mb-1 break-words">{media.original_filename}</h3>
                <p className="text-sm text-gray-600">Type: {media.mimetype}</p>
                <p className="text-sm text-gray-600">Status: {media.processing_status.replace(/_/g, ' ')}</p>
                {media.error_message && <p className="text-xs text-red-500 mt-1">Error: {media.error_message}</p>}
                <p className="text-xs text-gray-500 mt-1">Uploaded: {new Date(media.upload_timestamp * 1000).toLocaleString()}</p>
                {media.description && <p className="text-sm text-gray-700 mt-2 italic">"{media.description}"</p>}
              </div>

              {/* Media Preview / Download */}
              <div className="mt-4 flex-grow flex items-center justify-center min-h-[150px] max-h-[250px] bg-gray-50 rounded-md overflow-hidden">
                {media.processing_status === 'completed' && media.web_url ? (
                  <>
                    {media.mimetype.startsWith('image/') && (
                      <img src={media.web_url} alt={media.original_filename} className="max-w-full max-h-full object-contain" />
                    )}
                    {media.mimetype.startsWith('video/') && (
                      <video controls src={media.web_url} className="max-w-full max-h-full object-contain"></video>
                    )}
                    {media.mimetype.startsWith('audio/') && (
                      <audio controls src={media.web_url} className="w-full"></audio>
                    )}
                    {/* Fallback for other completed types like PDF or blobs */}
                    {!media.mimetype.startsWith('image/') && !media.mimetype.startsWith('video/') && !media.mimetype.startsWith('audio/') && (
                      <div className="text-center text-gray-500 text-sm">
                        <p>File type not previewable.</p>
                        {media.download_url && (
                          <a href={media.download_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-1 inline-block">Download</a>
                        )}
                      </div>
                    )}
                  </>
                ) : media.processing_status === 'queued' || media.processing_status === 'queued_import' ? (
                  <div className="text-center text-blue-500">Processing...</div>
                ) : media.processing_status === 'failed' || media.processing_status === 'failed_import' ? (
                  <div className="text-center text-red-500">Processing Failed</div>
                ) : (
                  <div className="text-center text-gray-500">Not available</div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap justify-center gap-2">
                {media.item_type === 'media' && (
                  <button
                    onClick={() => handleToggleMediaHidden(media.id)}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors 
                      ${media.is_hidden ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {media.is_hidden ? 'Show' : 'Hide'}
                  </button>
                )}
                {media.item_type === 'media' && (
                  <button
                    onClick={() => handleToggleMediaLiked(media.id)}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors 
                      ${media.is_liked ? 'bg-pink-100 text-pink-700 hover:bg-pink-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {media.is_liked ? 'Unlike' : 'Like'}
                  </button>
                )}
                {media.download_url && (
                  <a href={media.download_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-sm font-semibold rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                    Download
                  </a>
                )}
                <button
                  onClick={() => handleDeleteMedia(media.id)}
                  className="px-3 py-1 text-sm font-semibold rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No media items in this Lightbox yet. Upload some!</p>
      )}
    </div>
  );
}
