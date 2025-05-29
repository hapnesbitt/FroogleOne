// src/services/api.ts

// --- Configuration ---
// Make sure to set this in your .env.local file in your Next.js project
// e.g., NEXT_PUBLIC_API_BASE_URL=http://localhost:5005/api/v1
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5005/api/v1';

// --- Interfaces for API Data Structures ---

// Represents a user session status
export interface UserSession {
  username: string;
  isAdmin: boolean;
}

// Common API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string; // For explicit error messages from API error handlers
  // Add other common fields if your API always returns them
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
  
  // URLs provided by the backend for frontend consumption
  web_url?: string;       // For display (e.g., <img> src, <video> src)
  download_url?: string;  // For explicit download links
  web_path_segment?: string; // For public views, relative to static/uploads
  public_download_path_segment?: string; // For public blob downloads
}

// Interface for a single Batch (Lightbox)
export interface Batch {
  id: string; // UUID string
  name: string;
  user_id: string; // Owner username
  creation_timestamp: number; // Unix timestamp (float)
  last_modified_timestamp: number; // Unix timestamp (float)
  is_shared: boolean; // Converted from '0'/'1' to boolean
  share_token?: string; // Only present if shared
  item_count: number; // Number of media items in the batch
  media_items?: MediaItem[]; // Only included when fetching a single batch's details
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
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Important for sending/receiving session cookies
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      // Attempt to parse JSON error message if available
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || response.statusText || 'Unknown API error';
      console.error(`API Error: ${response.status} ${errorMessage}`, errorData);
      return { success: false, message: errorMessage, error: errorData.error };
    }

    const data = await response.json();
    return { success: true, message: data.message || 'Success', data: data };
  } catch (error: any) {
    console.error(`Network or unexpected error fetching ${url}:`, error);
    return { success: false, message: error.message || 'Network error occurred.' };
  }
}

// Helper for file uploads (uses FormData)
async function apiUploadFetch<T>(
  endpoint: string,
  formData: FormData,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      method: 'POST',
      body: formData, // FormData doesn't need 'Content-Type': 'application/json'
      credentials: 'include', // Important for sending/receiving session cookies
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || response.statusText || 'Unknown upload error';
      console.error(`Upload API Error: ${response.status} ${errorMessage}`, errorData);
      return { success: false, message: errorMessage, error: errorData.error };
    }

    const data = await response.json();
    return { success: true, message: data.message || 'Upload successful', data: data };
  } catch (error: any) {
    console.error(`Network or unexpected error during upload ${url}:`, error);
    return { success: false, message: error.message || 'Network error occurred during upload.' };
  }
}


// --- Authentication Endpoints ---

export const getAuthStatus = async (): Promise<ApiResponse<{ isLoggedIn: boolean; user: UserSession | null; }>> => {
  return apiFetch('/auth/status', { method: 'GET' });
};

export const login = async (username: string, password: string): Promise<ApiResponse<{ user: UserSession }>> => {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
};

export const logout = async (): Promise<ApiResponse<null>> => {
  return apiFetch('/auth/logout', { method: 'POST' });
};

export const register = async (username: string, password: string, confirm_password: string): Promise<ApiResponse<null>> => {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, confirm_password }),
  });
};

// --- Batch (Lightbox) Management Endpoints ---

export const getBatches = async (): Promise<ApiResponse<{ batches: Batch[] }>> => {
  return apiFetch('/batches', { method: 'GET' });
};

export const createBatch = async (name: string): Promise<ApiResponse<{ batch: Batch }>> => {
  return apiFetch('/batches', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
};

export const getBatchDetails = async (batchId: string): Promise<ApiResponse<{ batch: Batch }>> => {
  return apiFetch(`/batches/${batchId}`, { method: 'GET' });
};

export const toggleShareBatch = async (batchId: string): Promise<ApiResponse<{ batch_id: string; is_shared: boolean; share_token?: string; public_share_path?: string; }>> => {
  return apiFetch(`/batches/${batchId}/toggle_share`, { method: 'POST', body: JSON.stringify({}) }); // Empty body is fine for POST
};

export const renameBatch = async (batchId: string, newName: string): Promise<ApiResponse<{ batch_id: string; new_name: string; }>> => {
  return apiFetch(`/batches/${batchId}/rename`, {
    method: 'POST',
    body: JSON.stringify({ new_name: newName }),
  });
};

export const deleteBatch = async (batchId: string): Promise<ApiResponse<{ batch_id: string; message: string; }>> => {
  return apiFetch(`/batches/${batchId}`, { method: 'DELETE' });
};

// Note: For download functions, `fetch` will initiate a download, it won't return JSON.
// You'd typically call these by setting window.location.href or opening a new tab.
export const downloadMedia = (mediaId: string): void => {
  const url = `${API_BASE_URL}/media/${mediaId}/download`;
  window.open(url, '_blank'); // Opens in a new tab, triggering download
};

// --- Upload Endpoint (complex due to FormData and multiple types) ---
export type UploadType = 'media' | 'import_zip' | 'blob_storage';

export const uploadFiles = async (
  files: FileList,
  uploadType: UploadType = 'media', // default to 'media'
  existingBatchId?: string,
  batchName?: string
): Promise<ApiResponse<{ batch_id: string; batch_name: string; uploaded_items: UploadedItemMeta[] }>> => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files[]', files[i]);
  }
  formData.append('upload_type', uploadType);
  if (existingBatchId) {
    formData.append('existing_batch_id', existingBatchId);
  }
  if (batchName) {
    formData.append('batch_name', batchName);
  }

  // apiUploadFetch handles the method as POST
  return apiUploadFetch('/upload', formData);
};

// --- Public Endpoints (no authentication required) ---
// Note: These uses 'fetch' directly as they don't need credentials: 'include'
// since they don't rely on Flask sessions for authentication.

async function publicApiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || response.statusText || 'Unknown API error';
      console.error(`Public API Error: ${response.status} ${errorMessage}`, errorData);
      return { success: false, message: errorMessage, error: errorData.error };
    }

    const data = await response.json();
    return { success: true, message: data.message || 'Success', data: data };
  } catch (error: any) {
    console.error(`Network or unexpected error public fetching ${url}:`, error);
    return { success: false, message: error.message || 'Network error occurred.' };
  }
}

export const getPublicBatchDetails = async (shareToken: string): Promise<ApiResponse<{ batch: Batch; media_items: MediaItem[] }>> => {
  return publicApiFetch(`/public/batches/${shareToken}`, { method: 'GET' });
};

export const getPublicSlideshow = async (shareToken: string): Promise<ApiResponse<{ batch: Batch; media_data: { id: string; filepath_segment: string; mimetype: string; original_filename: string; }[]; }>> => {
  return publicApiFetch(`/public/slideshow/${shareToken}`, { method: 'GET' });
};

export const publicDownloadMedia = (shareToken: string, mediaId: string): void => {
  const url = `${API_BASE_URL}/public/media/${shareToken}/${mediaId}/download`;
  window.open(url, '_blank'); // Opens in a new tab, triggering download
};

// --- Admin Endpoints (requires admin privileges) ---

export const getAdminUsers = async (): Promise<ApiResponse<{ users: UserSession[] }>> => {
  return apiFetch('/admin/users', { method: 'GET' });
};

export const changeUserPassword = async (username: string, newPassword: string): Promise<ApiResponse<null>> => {
  return apiFetch('/admin/users/change_password', {
    method: 'POST',
    body: JSON.stringify({ username, new_password: newPassword }),
  });
};
