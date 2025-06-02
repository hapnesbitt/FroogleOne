// /home/www/froogle/src/services/api.ts

const API_BASE_URL_ROOT = process.env.NEXT_PUBLIC_FLASK_API_BASE_URL || 'http://localhost:5005';

export interface ApiResponse<T = unknown> { // Changed 'any' to 'unknown'
  success: boolean;
  message?: string;
  // Specific fields for different responses
  token?: string;
  user?: User;
  isLoggedIn?: boolean;
  batches?: Batch[];
  batch?: Batch;
  is_shared?: boolean;
  share_token?: string | null;
  public_share_url?: string;
  public_slideshow_url?: string;
  media_items?: MediaItem[];
  media_data?: MediaItem[]; // For public slideshow response
  data?: T; // Generic data field for API responses
}

export interface User {
  id: string;
  username: string;
  is_admin: boolean;
}

export interface Batch {
  id: string;
  name: string;
  user_id: string;
  creation_timestamp: number;
  last_modified_timestamp: number;
  item_count: number;
  playable_media_count?: number;
  is_shared: boolean;
  share_token: string | null;
  public_share_url?: string;
  public_slideshow_url?: string;
  media_items?: MediaItem[]; // Optional, for details view
}

export interface MediaItem {
  id: string;
  batch_id: string;
  original_filename: string;
  mimetype: string;
  file_size: number;
  upload_timestamp: number;
  processing_status: 'queued' | 'processing' | 'completed' | 'failed' | 'queued_import' | 'failed_import';
  error_message?: string;
  web_url?: string; // URL for web-optimized display (e.g., resized image, converted video)
  download_url?: string; // URL to download the original file (or web_url if no original)
  public_display_url?: string; // For slideshows, if different from web_url for public access
  public_download_url?: string; // For slideshows, if different for public download
  is_hidden: boolean;
  is_liked: boolean;
  description?: string; // Optional user-provided description
  item_type?: string; // Or 'item_type: string;' if it's always there
}

export type UploadType = 'media' | 'import_zip' | 'blob_storage';

// Removed eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callApi<T>(endpoint: string, method: string = 'GET', data?: unknown): Promise<ApiResponse<T>> { // Changed 'data?: any' to 'data?: unknown'
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL_ROOT}${endpoint}`, config);
    const result = await response.json();

    if (response.ok) {
      return { success: true, ...result };
    } else {
      return { success: false, message: result.message || 'An error occurred.' };
    }
  } catch (error) {
    console.error('API call error:', error);
    // You might want to cast error to 'Error' if you need to access 'error.message'
    return { success: false, message: 'Network error or server unreachable.' };
  }
}

export async function register(username: string, password: string, confirmPassword: string): Promise<ApiResponse> {
  return callApi('/api/v1/auth/register', 'POST', { username, password, confirm_password: confirmPassword });
}

export async function login(username: string, password: string): Promise<ApiResponse> {
  const response = await callApi('/api/v1/auth/login', 'POST', { username, password });
  return response;
}

export async function logout(): Promise<ApiResponse> {
  localStorage.removeItem('token');
  return { success: true, message: 'Logged out successfully.' }; // Client-side logout
}

export async function getAuthStatus(): Promise<ApiResponse> {
  const response = await callApi('/api/v1/auth/status', 'GET');
  return response;
}

export async function getBatches(): Promise<ApiResponse<{ batches: Batch[] }>> {
  return callApi('/api/v1/batches', 'GET');
}

export async function createBatch(name: string): Promise<ApiResponse<{ batch: Batch }>> {
  return callApi('/api/v1/batches', 'POST', { name });
}

export async function getBatchDetails(batchId: string): Promise<ApiResponse<{ batch: Batch; media_items: MediaItem[] }>> {
  return callApi(`/api/v1/batches/${batchId}`, 'GET');
}

export async function deleteBatch(batchId: string): Promise<ApiResponse> {
  return callApi(`/api/v1/batches/${batchId}`, 'DELETE');
}

export async function renameBatch(batchId: string, newName: string): Promise<ApiResponse> {
  return callApi(`/api/v1/batches/${batchId}/rename`, 'POST', { new_name: newName });
}

export async function toggleShareBatch(batchId: string): Promise<ApiResponse<{ is_shared: boolean; share_token?: string; public_share_url?: string; public_slideshow_url?: string }>> {
  return callApi(`/api/v1/batches/${batchId}/toggle_share`, 'POST');
}


export async function toggleMediaHidden(mediaId: string): Promise<ApiResponse<{is_hidden: boolean}>> {
  return callApi(`/api/v1/media/${mediaId}/toggle_hidden`, 'POST');
}

export async function toggleMediaLiked(mediaId: string): Promise<ApiResponse<{is_liked: boolean}>> {
  return callApi(`/api/v1/media/${mediaId}/toggle_liked`, 'POST');
}

export async function deleteMedia(mediaId: string): Promise<ApiResponse> {
  return callApi(`/api/v1/media/${mediaId}`, 'DELETE');
}


// Removed eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function uploadFiles(files: File[], uploadType: UploadType, existingBatchId?: string, newBatchName?: string, description?: string): Promise<ApiResponse<unknown>> { // Changed 'ApiResponse<any>' to 'ApiResponse<unknown>'
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  formData.append('upload_type', uploadType);
  if (existingBatchId) {
    formData.append('batch_id', existingBatchId);
  }
  if (newBatchName) {
    formData.append('new_batch_name', newBatchName);
  }
  if (description) {
    formData.append('description', description);
  }

  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL_ROOT}/api/v1/upload`, {
      method: 'POST',
      headers, // No Content-Type for FormData, browser sets it automatically
      body: formData,
    });

    const result = await response.json();
    if (response.ok) {
      return { success: true, ...result };
    } else {
      return { success: false, message: result.message || 'Upload failed.' };
    }
  } catch (error) {
    console.error('Upload error:', error);
    // Cast error to 'Error' if you need to access 'error.message'
    return { success: false, message: 'Network error during upload.' };
  }
}


// Removed eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPublicSlideshow(shareToken: string): Promise<ApiResponse<{ batch: Batch; media_data: MediaItem[]; }>> { // Changed 'ApiResponse<any>' to 'ApiResponse<unknown>'
  return callApi(`/api/v1/public_slideshow/${shareToken}`, 'GET');
}
