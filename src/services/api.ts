// /home/www/froogle/src/services/api.ts
// Updated to fix API response parsing and ensure correct data access.

// --- Configuration ---
// Make sure to set this in your .env.local file in your Next.js project
// e.g., NEXT_PUBLIC_FLASK_API_BASE_URL=http://localhost:5005
const API_BASE_URL_ROOT = process.env.NEXT_PUBLIC_FLASK_API_BASE_URL || 'http://localhost:5005';
const API_PREFIX = '/api/v1'; // This is hardcoded to match your Flask backend's API_PREFIX

// Helper function to construct full API URLs
const constructFullApiUrl = (path: string) => `${API_BASE_URL_ROOT}${API_PREFIX}${path}`;

// --- Interfaces for API Data Structures ---

export interface UserSession {
  username: string;
  isAdmin: boolean;
}

// Common API response structure
// T is now ONLY the top-level part of the response object, excluding 'success' and 'message'.
// Example: if Flask returns {success: true, batch: {...}}, then T is { batch: Batch }
// The ApiResponse wrapper then adds success/message/error around it.
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string; // General success or error message
  error?: string; // More specific error type/code
  // ALL specific data fields from Flask's JSON response will now be directly
  // part of the T type.
  // The 'data' field is removed from this generic interface, as we now expect specific keys.
  // The consumer will assert (T as YourExpectedType).yourKey
}

// Interface for a single Media Item
export interface MediaItem {
  id: string; // UUID string
  original_filename: string;
  filename_on_disk: string; // The name on disk after processing/renaming
  filepath: string; // Relative path on the server (e.g., "user/batch_id/filename.ext")
  mimetype: string;
  is_hidden: boolean; // Converted from '0'/'1' to boolean
  is_liked: boolean;   // Converted from '0'/'1' to boolean
  uploader_user_id: string;
  batch_id: string; // UUID string
  upload_timestamp: number; // Unix timestamp (float)
  description: string;
  item_type: 'media' | 'blob' | 'archive_import'; // 'media' for transcodable, 'blob' for direct, 'archive_import' for zip files
  processing_status: 'queued' | 'completed' | 'failed' | 'queued_import' | 'completed_import' | 'failed_import';
  error_message?: string; // From Flask for failed processing
  
  // URLs provided by the backend for frontend consumption (new, direct URLs)
  web_url?: string;       // Authenticated display (e.g., <img> src, <video> src)
  download_url?: string;  // Authenticated explicit download links
  public_display_url?: string; // Public display URL for images/videos/audio
  public_download_url?: string; // Public explicit download links for any file type
}

// Interface for a single Batch (Lightbox)
export interface Batch {
  id: string; // UUID string
  name: string;
  user_id: string; // Owner username
  creation_timestamp: number; // Unix timestamp (float)
  last_modified_timestamp: number; // Unix timestamp (float)
  is_shared: boolean; // Converted from '0'/'1' to boolean
  share_token?: string | null; // Null if not shared
  item_count?: number; // Number of media items in the batch (total, including processing/hidden)
  playable_media_count?: number; // Count of media items ready for slideshow (completed, not hidden, suitable type)
  media_items?: MediaItem[]; // Only included when fetching a single batch's details
  
  // URLs for sharing a batch (provided by Flask API when shared)
  public_share_url?: string; // Full URL to public batch gallery view
  public_slideshow_url?: string; // Full URL to public slideshow view
}

// Interface for Uploaded Item Meta (from /api/v1/upload response)
export interface UploadedItemMeta {
  id?: string; // Item ID if successfully processed/queued
  filename: string;
  status: 'skipped' | 'queued' | 'completed' | 'queued_import' | 'error';
  message: string;
}

// --- API Client Functions ---

// Helper for consistent fetch requests
// T is now the type of the _entire successful response body_ (excluding success/message/error).
// Example: For getBatchDetails, Flask returns {success: true, batch: Batch}. So T here will be { batch: Batch }.
// apiFetch will return { success: true, batch: Batch } if successful.
// /home/www/froogle/src/services/api.ts

// ... (rest of your imports, configuration, and interfaces are the same) ...

// --- API Client Functions ---

// Helper for consistent fetch requests
// T is now the type of the _entire successful response body_ (excluding success/message/error).
// Example: For getBatchDetails, Flask returns {success: true, batch: Batch}. So T here will be { batch: Batch }.
// apiFetch will return { success: true, batch: Batch } if successful.
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse & T> { // ApiResponse & T combines the common ApiResponse fields with the specific T fields
  const url = constructFullApiUrl(endpoint);

  // --- CRUCIAL CHANGE START ---
  const headers: HeadersInit = {
    // Spread any custom headers passed in options first
    ...options?.headers, 
  };

  // ONLY set 'Content-Type: application/json' if the body is NOT FormData.
  // If it's FormData, let the browser handle the Content-Type automatically.
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  // --- CRUCIAL CHANGE END ---

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Important for sending/receiving session cookies
      headers: headers, // Use the dynamically constructed headers object
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {}; // data is the raw Flask response JSON

    if (!response.ok) {
      const errorMessage = data.message || response.statusText || 'Unknown API error';
      console.error(`API Error (${response.status}): ${errorMessage}`, data);
      return { success: false, message: errorMessage, error: data.error || response.statusText } as ApiResponse & T;
    }
    // For successful responses, Flask's API returns { success: true, key1: val1, key2: val2 }
    // We combine the common ApiResponse fields (success, message) with the rest of the data.
    return { success: true, ...data } as ApiResponse & T;
  } catch (error: any) {
    console.error(`Network or unexpected error fetching ${url}:`, error);
    return { success: false, message: error.message || 'Network error occurred.' } as ApiResponse & T;
  }
}

// ... (rest of your API functions like getAuthStatus, login, uploadFiles etc. are the same) ...

// --- Authentication Endpoints ---

export const getAuthStatus = (): Promise<ApiResponse & { isLoggedIn: boolean; user: UserSession | null; }> =>
  apiFetch('/auth/status');

export const login = (username: string, password: string): Promise<ApiResponse & { user: UserSession }> =>
  apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const logout = (): Promise<ApiResponse> => // Logout has no specific data beyond success/message
  apiFetch('/auth/logout', { method: 'POST' });

export const register = (username: string, password: string, confirm_password: string): Promise<ApiResponse> =>
  apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, confirm_password }),
  });

// --- Batch (Lightbox) Management Endpoints ---

export const getBatches = (): Promise<ApiResponse & { batches: Batch[] }> =>
  apiFetch('/batches');

export const createBatch = (name: string): Promise<ApiResponse & { batch: Batch }> =>
  apiFetch('/batches', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const getBatchDetails = (batchId: string): Promise<ApiResponse & { batch: Batch }> =>
  apiFetch(`/batches/${batchId}`);

export const toggleShareBatch = (batchId: string): Promise<ApiResponse & { is_shared: boolean; share_token: string | null; public_share_url?: string; public_slideshow_url?: string; }> =>
  apiFetch(`/batches/${batchId}/toggle_share`, { method: 'POST', body: JSON.stringify({}) }); 

export const renameBatch = (batchId: string, new_name: string): Promise<ApiResponse & { batch_id: string; new_name: string; }> =>
  apiFetch(`/batches/${batchId}/rename`, {
    method: 'POST',
    body: JSON.stringify({ new_name: new_name }),
  });

export const deleteBatch = (batchId: string): Promise<ApiResponse & { batch_id: string; message: string; }> =>
  apiFetch(`/batches/${batchId}`, { method: 'DELETE' });

export const exportBatch = (batchId: string): Promise<Response> => { // Returns raw Response object for file download
    return fetch(constructFullApiUrl(`/batches/${batchId}/export`), { // Use constructFullApiUrl here too
        method: 'GET',
        credentials: 'include',
    });
};

// --- Media Item Management Endpoints ---
export const uploadFiles = (
  files: File[], 
  uploadType: 'media' | 'import_zip' | 'blob_storage' = 'media', // Changed order of params
  existingBatchId?: string, 
  newBatchName?: string, 
  description: string = ''
): Promise<ApiResponse & { batch_id: string; batch_name: string; uploaded_items: UploadedItemMeta[] }> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files[]', file); 
  });
  formData.append('upload_type', uploadType);
  if (existingBatchId) {
    formData.append('existing_batch_id', existingBatchId);
  }
  if (newBatchName) {
    formData.append('batch_name', newBatchName);
  }
  formData.append('description', description); 

  return apiFetch('/upload', {
    method: 'POST',
    body: formData, 
  });
};

export const toggleMediaHidden = (mediaId: string): Promise<ApiResponse & { is_hidden: boolean }> =>
  apiFetch(`/media/${mediaId}/toggle_hidden`, { method: 'POST' });

export const toggleMediaLiked = (mediaId: string): Promise<ApiResponse & { is_liked: boolean }> =>
  apiFetch(`/media/${mediaId}/toggle_liked`, { method: 'POST' });

export const deleteMedia = (mediaId: string): Promise<ApiResponse> => // deleteMedia might return no data beyond success/message
  apiFetch(`/media/${mediaId}`, { method: 'DELETE' });

// --- Public Endpoints (no authentication required) ---
// Note: These use 'fetch' directly as they don't need credentials: 'include'
// since they don't rely on Flask sessions for authentication.

async function publicApiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse & T> {
  const url = constructFullApiUrl(endpoint); // Use the new constructor
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': options?.body instanceof FormData ? undefined : 'application/json',
        ...options?.headers,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {}; // data is the raw Flask response JSON

    if (!response.ok) {
      const errorMessage = data.message || response.statusText || 'Unknown API error';
      console.error(`Public API Error (${response.status}): ${errorMessage}`, data);
      return { success: false, message: errorMessage, error: data.error || response.statusText } as ApiResponse & T;
    }
    return { success: true, ...data } as ApiResponse & T;
  } catch (error: any) {
    console.error(`Network or unexpected error public fetching ${url}:`, error);
    return { success: false, message: error.message || 'Network error occurred.' } as ApiResponse & T;
  }
}

export const getPublicBatch = (shareToken: string): Promise<ApiResponse & { batch: Batch; media_items: MediaItem[] }> =>
  publicApiFetch(`/public/batches/${shareToken}`);

export const getPublicSlideshow = (shareToken: string): Promise<ApiResponse & { batch: Batch; media_data: MediaItem[] }> => // Corrected media_data type to MediaItem[]
  publicApiFetch(`/public/slideshow/${shareToken}`);

// --- Admin Endpoints (requires admin privileges) ---

export const getAdminUsers = (): Promise<ApiResponse & { users: UserSession[] }> =>
  apiFetch('/admin/users');

export const changeUserPassword = (username: string, new_password: string): Promise<ApiResponse> =>
  apiFetch('/admin/users/change_password', {
    method: 'POST',
    body: JSON.stringify({ username, new_password: new_password }),
  });
