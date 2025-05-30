# /home/www/froogle/backend/api_app.py
# Version: Medium V3.0 - Full API conversion from monolithic app.py

import datetime
import os
import uuid
import json
import shutil
import zipfile
from functools import wraps
from io import BytesIO # Used for export only
import logging
import secrets
import subprocess

from flask import Flask, request, session, url_for, send_file, current_app, abort, jsonify
from flask_cors import CORS # Keep CORS for API
# Removed CSRFProtect - handled differently in API context

from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import redis
from celery import Celery
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

app = Flask(__name__)

# --- Flask App Configuration ---
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'fallback_dev_secret_key_CHANGE_ME_IN_PROD_NOW')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None' # Required for cross-site cookie in modern browsers
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true' # Set True in production for HTTPS

# --- UPLOAD_FOLDER CONFIGURATION ---
# Base directory of the Flask application (where api_app.py is located)
_backend_base_dir = os.path.dirname(os.path.abspath(__file__))

# UPLOAD_FOLDER is relative to the backend_base_dir, but we construct the absolute path here
# so that other parts of the app can rely on it being absolute.
# This makes it robust whether run by Flask dev server or Gunicorn.
UPLOAD_FOLDER_RELATIVE = os.environ.get('UPLOAD_FOLDER', 'static/uploads')
app.config['UPLOAD_FOLDER'] = os.path.join(_backend_base_dir, UPLOAD_FOLDER_RELATIVE)

app.logger.info(f"Configured UPLOAD_FOLDER (absolute path): {app.config['UPLOAD_FOLDER']}")

app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 9000 * 1024 * 1024)) # 9GB
app.config['FFMPEG_PATH'] = os.environ.get('FFMPEG_PATH', 'ffmpeg')

app.config['AUDIO_MP3_ENCODER'] = 'libmp3lame'
app.config['AUDIO_MP3_OPTIONS'] = os.environ.get('AUDIO_MP3_OPTIONS', '-q:a 0 -compression_level 0').split()
app.config['AUDIO_MP3_SAMPLE_RATE'] = os.environ.get('AUDIO_MP3_SAMPLE_RATE', '44100')
app.config['AUDIO_FORMATS_TO_CONVERT_TO_MP3'] = set(
    os.environ.get('AUDIO_FORMATS_TO_CONVERT_TO_MP3', 'wav,flac,m4a,aac,ogg,opus').lower().split(',')
)
if '' in app.config['AUDIO_FORMATS_TO_CONVERT_TO_MP3'] and len(app.config['AUDIO_FORMATS_TO_CONVERT_TO_MP3']) == 1:
    app.config['AUDIO_FORMATS_TO_CONVERT_TO_MP3'] = set()

app.config['VIDEO_MP4_VIDEO_CODEC'] = 'libx264' # Corrected typo, was libx264 but libx64 is more common
app.config['VIDEO_MP4_VIDEO_PRESET'] = os.environ.get('VIDEO_MP4_VIDEO_PRESET', 'veryslow')
app.config['VIDEO_MP4_VIDEO_CRF'] = os.environ.get('VIDEO_MP4_VIDEO_CRF', '16')
app.config['VIDEO_MP4_AUDIO_CODEC'] = os.environ.get('VIDEO_MP4_AUDIO_CODEC', 'aac')
app.config['VIDEO_MP4_AUDIO_BITRATE'] = os.environ.get('VIDEO_MP4_AUDIO_BITRATE', '320k')
app.config['VIDEO_FORMATS_TO_CONVERT_TO_MP4'] = set(
    os.environ.get('VIDEO_FORMATS_TO_CONVERT_TO_MP4', 'mkv,mov,avi,wmv,flv').lower().split(',')
)
if '' in app.config['VIDEO_FORMATS_TO_CONVERT_TO_MP4'] and len(app.config['VIDEO_FORMATS_TO_CONVERT_TO_MP4']) == 1:
    app.config['VIDEO_FORMATS_TO_CONVERT_TO_MP4'] = set()

app.config['APP_REDIS_DB_NUM'] = int(os.environ.get('APP_REDIS_DB_NUM', 0))

# --- Celery Configuration & Setup ---
redis_password_for_celery = os.environ.get('REDIS_PASSWORD', None)
redis_host_for_celery = os.environ.get('REDIS_HOST', 'localhost')
redis_port_for_celery = int(os.environ.get('REDIS_PORT', 6379))
redis_auth_part = f":{redis_password_for_celery}@" if redis_password_for_celery else ""
CELERY_BROKER_URL_CONFIG = f"redis://{redis_auth_part}{redis_host_for_celery}:{redis_port_for_celery}/0"
CELERY_RESULT_BACKEND_CONFIG = f"redis://{redis_auth_part}{redis_host_for_celery}:{redis_port_for_celery}/1"

app.config.update(
    broker_url=CELERY_BROKER_URL_CONFIG,
    result_backend=CELERY_RESULT_BACKEND_CONFIG,
    task_track_started=True,
)
def make_celery(flask_app):
    celery_instance = Celery(
        flask_app.import_name,
        broker=flask_app.config['broker_url'],
        backend=flask_app.config['result_backend']
    )
    celery_instance.conf.update(flask_app.config)
    class ContextTask(celery_instance.Task):
        abstract = True
        def __call__(self, *args, **kwargs):
            with flask_app.app_context():
                return self.run(*args, **kwargs)
    celery_instance.Task = ContextTask
    return celery_instance
celery = make_celery(app)

# --- Logging Configuration ---
log_level_str = os.environ.get('LOG_LEVEL', 'INFO' if not app.debug else 'DEBUG').upper()
log_level = getattr(logging, log_level_str, logging.INFO)
if not app.logger.handlers:
    stream_handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] [%(name)s] [%(module)s.%(funcName)s:%(lineno)d] - %(message)s')
    stream_handler.setFormatter(formatter)
    app.logger.addHandler(stream_handler)
    app.logger.setLevel(log_level)
    app.logger.propagate = False # Prevent double logging if Gunicorn/Werkzeug also add handlers
app.logger.info(f"Flask logger configured to level {log_level_str}.")


# --- CORS Configuration (Crucial for Next.js) ---
# Allow requests from your Next.js frontend (e.g., http://localhost:3000)
# In production, replace '*' with your actual frontend domain(s).
CORS(
    app,
    resources={r"/api/v1/*": {"origins": [
        "http://localhost:3000",       # Next.js dev server
        "http://127.0.0.1:3000",       # Another common local host
        # Add other frontend origins if necessary, e.g., for different dev environments
        # "http://localhost:4200",     # For Angular if you had it
        # "http://127.0.0.1:4200"
    ]}},
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRFToken"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    supports_credentials=True, # Important for sessions/cookies
    max_age=86400 # Cache preflight requests for 24 hours
)
app.logger.info("CORS configured for /api/v1/* with detailed options, allowing http://localhost:3000.")


# --- Redis Client Setup for Flask app ---
redis_client = None
redis_connection_message = "Redis client not initialized."
try:
    redis_client = redis.Redis(
        host=os.environ.get('REDIS_HOST', 'localhost'),
        port=int(os.environ.get('REDIS_PORT', 6379)),
        db=app.config['APP_REDIS_DB_NUM'],
        password=os.environ.get('REDIS_PASSWORD', None),
        decode_responses=True,
        socket_connect_timeout=5,
        socket_keepalive=True,
        retry_on_timeout=True
    )
    redis_client.ping()
    redis_connection_message = f"Successfully connected to Redis DB {app.config['APP_REDIS_DB_NUM']} at {redis_client.connection_pool.connection_kwargs.get('host')}:{redis_client.connection_pool.connection_kwargs.get('port')}."
    app.logger.info(redis_connection_message)
except Exception as e:
    redis_connection_message = f"Could not connect to Redis: {e}"
    app.logger.error(f"FATAL: Flask app could not connect to Redis DB {app.config['APP_REDIS_DB_NUM']}: {e}.")
    redis_client = None # Ensure client is None if connection fails

# --- Data Schemas & Mime Types ---
ALLOWED_EXTENSIONS = {
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg', 'avif', 'bmp', 'ico',
    'mp4', 'mkv', 'mov', 'webm', 'ogv', '3gp', '3g2', 'avi', 'wmv', 'flv', 'mpg', 'mpeg',
    'mp3', 'aac', 'wav', 'ogg', 'opus', 'flac', 'm4a', 'wma', 'pdf',
    'zip', 'tar', 'gz', 'tgz', '7z'
}
MEDIA_PROCESSING_EXTENSIONS = {
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg', 'avif', 'bmp', 'ico',
    'mp4', 'mkv', 'mov', 'webm', 'ogv', '3gp', '3g2', 'avi', 'wmv', 'flv', 'mpg', 'mpeg',
    'mp3', 'aac', 'wav', 'ogg', 'opus', 'flac', 'm4a', 'wma', 'pdf'
}
MIME_TYPE_MAP = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.heic': 'image/heic', '.heif': 'image/heif', '.svg': 'image/svg+xml',
    '.avif': 'image/avif', '.bmp': 'image/bmp', '.ico': 'image/x-icon',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska', '.webm': 'video/webm',
    '.ogv': 'video/ogg', '.3gp': 'video/3gpp', '.3g2': 'video/3gpp2', '.avi': 'video/x-msvideo',
    '.wmv': 'video/x-ms-wmv', '.flv': 'video/x-flv', '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg',
    '.mp3': 'audio/mpeg', '.aac': 'audio/aac', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.opus': 'audio/opus', '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.wma': 'audio/x-ms-wma',
    '.pdf': 'application/pdf', '.zip': 'application/zip', '.tar': 'application/x-tar',
    '.gz': 'application/gzip', '.tgz': 'application/gzip', '.7z': 'application/x-7z-compressed',
}

# --- Helper Functions ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_media_for_processing(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in MEDIA_PROCESSING_EXTENSIONS

def get_app_data_redis_client():
    # This helper is used by Celery tasks, which may run in a different process.
    # It ensures the Celery task gets a fresh Redis client connected with app config.
    # For direct Flask routes, `redis_client` global variable is used.
    _app_context = current_app._get_current_object() if current_app else None
    host = _app_context.config.get('REDIS_HOST', os.environ.get('REDIS_HOST', 'localhost')) if _app_context else os.environ.get('REDIS_HOST', 'localhost')
    port = int(_app_context.config.get('REDIS_PORT', os.environ.get('REDIS_PORT', 6379))) if _app_context else int(os.environ.get('REDIS_PORT', 6379))
    db_num = _app_context.config.get('APP_REDIS_DB_NUM', 0) if _app_context else int(os.environ.get('APP_REDIS_DB_NUM', 0))
    password = _app_context.config.get('REDIS_PASSWORD', os.environ.get('REDIS_PASSWORD', None)) if _app_context else os.environ.get('REDIS_PASSWORD', None)
    return redis.Redis(host=host, port=port, db=db_num, password=password, decode_responses=True, socket_connect_timeout=5, socket_keepalive=True, retry_on_timeout=True)

def get_unique_disk_path_celery(directory, base_name, extension_with_dot, task_id_for_log=""):
    """Generates a unique file path for Celery tasks."""
    counter = 0; filename = f"{base_name}{extension_with_dot}"; path = os.path.join(directory, filename)
    _base = base_name
    while os.path.exists(path):
        counter += 1; filename = f"{_base}_{counter}{extension_with_dot}"; path = os.path.join(directory, filename)
        if counter > 100:
            _task_logger = current_app.logger if current_app else logging.getLogger(__name__)
            _task_logger.error(f"[Task {task_id_for_log}] High collision finding unique path for {base_name}{extension_with_dot}. Using UUID.")
            filename = f"{uuid.uuid4().hex}{extension_with_dot}"; path = os.path.join(directory, filename); break
    return path, filename

def get_unique_disk_path(directory, base, ext_dot): # Local helper for /upload
    """Generates a unique file path for direct Flask operations."""
    ct = 0; fname = f"{base}{ext_dot}"; pth = os.path.join(directory, fname); _b = base
    while os.path.exists(pth): ct += 1; fname = f"{_b}_{ct}{ext_dot}"; pth = os.path.join(directory, fname)
    if ct > 100: fname = f"{_b}_{uuid.uuid4().hex[:8]}{ext_dot}"; pth = os.path.join(directory,fname)
    return pth, fname

# --- Initial Admin User Setup ---
if redis_client:
    try:
        if not redis_client.sismember('users', 'admin'):
            admin_password = os.environ.get('LIGHTBOX_ADMIN_PASSWORD', 'ChangeThisDefaultAdminPassw0rd!')
            if admin_password == 'ChangeThisDefaultAdminPassw0rd!':
                 app.logger.warning("SECURITY WARNING: Using default admin password 'ChangeThisDefaultAdminPassw0rd!'. Change it immediately in .env or via admin panel.")
            redis_client.sadd('users', 'admin')
            redis_client.hset('user:admin', mapping={'password_hash': generate_password_hash(admin_password), 'is_admin': '1'})
            app.logger.info("Admin user 'admin' created/verified.")
    except redis.exceptions.RedisError as e: app.logger.error(f"Redis error during admin user setup: {e}.")
else: app.logger.warning("Redis not connected during startup. Admin user setup skipped.")

# --- API Prefix ---
API_PREFIX = '/api/v1'
app.logger.info(f"API prefix set to: {API_PREFIX}")

# --- API Decorators (modified to return JSON errors) ---
def login_required_api(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS': # Preflight requests handle by Flask-CORS
            return '', 204
        if 'username' not in session:
            app.logger.warning(f"API: Unauthorized access attempt to {request.path} (no session).")
            return jsonify(success=False, message="Authentication required. Please log in."), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required_api(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS': # Preflight requests handle by Flask-CORS
            return '', 204
        if 'username' not in session:
            app.logger.warning(f"API: Admin access attempt without login on {request.path}.")
            return jsonify(success=False, message="Authentication required."), 401
        if not session.get('is_admin'):
            app.logger.warning(f"API: User '{session.get('username','N/A')}' attempted admin access without privileges on {request.path}.")
            return jsonify(success=False, message="Admin privileges required."), 403
        return f(*args, **kwargs)
    return decorated_function

def owner_or_admin_access_required_api(item_type='batch'):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.method == 'OPTIONS': # Preflight requests handle by Flask-CORS
                return '', 204
            if 'username' not in session:
                app.logger.warning(f"API: Unauthorized access attempt to {request.path} for {item_type} (no session).")
                return jsonify(success=False, message="Authentication required."), 401
            if not redis_client:
                app.logger.error(f"API: DB service unavailable for {item_type} access check.")
                return jsonify(success=False, message="Database service temporarily unavailable."), 503

            item_id_key_in_kwargs = f'{item_type}_id'
            item_id_to_check = kwargs.get(item_id_key_in_kwargs)
            if not item_id_to_check:
                app.logger.error(f"API: Ownership check for {item_type}: No ID provided in kwargs: {kwargs}")
                return jsonify(success=False, message=f"Cannot verify ownership: {item_type.capitalize()} ID missing."), 400
            
            item_id_to_check_str = str(item_id_to_check)
            item_data_key = f'{item_type}:{item_id_to_check_str}'
            try:
                item_data = redis_client.hgetall(item_data_key)
            except redis.exceptions.RedisError as e:
                app.logger.error(f"API: Redis error fetching '{item_data_key}': {e}")
                return jsonify(success=False, message="Database error during ownership check."), 500
            
            if not item_data:
                app.logger.warning(f"API: {item_type.capitalize()} '{item_id_to_check_str}' not found.")
                return jsonify(success=False, message=f"{item_type.capitalize()} not found."), 404

            owner_field = 'uploader_user_id' if item_type == 'media' else 'user_id'
            item_owner = item_data.get(owner_field)
            if not item_owner:
                app.logger.error(f"API: Ownership check: Owner field '{owner_field}' missing for {item_data_key}.")
                return jsonify(success=False, message=f"Cannot verify ownership: {item_type.capitalize()} data inconsistent."), 500

            if item_owner != session['username'] and not session.get('is_admin'):
                app.logger.warning(f"API: User '{session['username']}' attempted unauthorized access to {item_type} '{item_id_to_check_str}' owned by '{item_owner}'.")
                return jsonify(success=False, message=f"No permission for this {item_type}."), 403
            
            # Pass item_data to the decorated function for convenience
            kwargs[f'{item_type}_data'] = item_data
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# --- Celery Tasks ---
@celery.task(bind=True, name='api_app.convert_video_to_mp4_task', max_retries=3, default_retry_delay=120)
def convert_video_to_mp4_task(self, original_video_temp_path, target_mp4_disk_path, media_id_for_update, batch_id_for_update, original_filename_for_log, disk_path_segment_for_batch, uploader_username_for_log):
    task_id = self.request.id; logger = current_app.logger
    logger.info(f"[VideoTask {task_id}] User:{uploader_username_for_log} Video->MP4: {original_filename_for_log} (MediaID:{media_id_for_update})")
    ffmpeg_path = current_app.config.get('FFMPEG_PATH', 'ffmpeg')
    vid_codec = current_app.config.get('VIDEO_MP4_VIDEO_CODEC'); vid_preset = current_app.config.get('VIDEO_MP4_VIDEO_PRESET')
    vid_crf = current_app.config.get('VIDEO_MP4_VIDEO_CRF'); aud_codec = current_app.config.get('VIDEO_MP4_AUDIO_CODEC')
    aud_bitrate = current_app.config.get('VIDEO_MP4_AUDIO_BITRATE')
    ffmpeg_command = [ffmpeg_path, '-hide_banner', '-loglevel', 'error', '-i', original_video_temp_path, '-c:v', vid_codec, '-preset', vid_preset, '-crf', vid_crf, '-c:a', aud_codec, '-b:a', aud_bitrate, '-movflags', '+faststart', '-f', 'mp4', '-y', target_mp4_disk_path]
    status_update = {'processing_status': 'failed', 'error_message': 'Unknown video conversion error.'}
    try:
        logger.info(f"[VideoTask {task_id}] Executing: {' '.join(ffmpeg_command)}")
        subprocess.run(ffmpeg_command, check=True, capture_output=True, text=True, timeout=10800)
        logger.info(f"[VideoTask {task_id}] Success: {original_filename_for_log}")
        final_name = os.path.basename(target_mp4_disk_path)
        final_rpath = os.path.join(disk_path_segment_for_batch, final_name)
        status_update = {'filename_on_disk': final_name, 'filepath': final_rpath, 'mimetype': 'video/mp4', 'processing_status': 'completed', 'error_message': ''}
        get_app_data_redis_client().hmset(f'media:{media_id_for_update}', status_update)
        logger.info(f"[VideoTask {task_id}] Redis updated for MediaID {media_id_for_update}.")
        return {'status': 'success', 'output_path': target_mp4_disk_path, 'media_id': media_id_for_update}
    except subprocess.CalledProcessError as e:
        err_out = e.stderr.strip() if e.stderr else "No stderr."; logger.error(f"[VideoTask {task_id}] FAILED (rc {e.returncode}): {original_filename_for_log}. Error: {err_out}")
        status_update.update({'error_message': f'Video conv. error (rc {e.returncode}): {err_out[:200]}'})
        if self.request.retries < self.max_retries: logger.info(f"[VideoTask {task_id}] Retrying ({self.request.retries + 1}/{self.max_retries})"); raise self.retry(exc=e, countdown=int(self.default_retry_delay * (2**self.request.retries)))
        raise
    except subprocess.TimeoutExpired as e:
        logger.error(f"[VideoTask {task_id}] TIMEOUT: {original_filename_for_log}"); status_update.update({'error_message': 'Video conversion timeout.'})
        if self.request.retries < self.max_retries: logger.info(f"[VideoTask {task_id}] Retrying ({self.request.retries + 1}/{self.max_retries})"); raise self.retry(exc=e, countdown=int(self.default_retry_delay * (2**self.request.retries)))
        raise
    except Exception as e:
        logger.error(f"[VideoTask {task_id}] Unexpected error: {e}", exc_info=True); status_update.update({'error_message': f'Unexpected error: {str(e)[:100]}'}); raise
    finally:
        r_client = get_app_data_redis_client()
        try:
            # Check if status was already set to completed by a successful path or completed_import
            if r_client.hget(f'media:{media_id_for_update}', 'processing_status') not in ['completed', 'completed_import']:
                r_client.hmset(f'media:{media_id_for_update}', status_update)
            logger.info(f"[VideoTask {task_id}] Final Redis status for MediaID {media_id_for_update}: {status_update.get('processing_status', 'N/A')}")
        except Exception as e_redis: logger.error(f"[VideoTask {task_id}] CRITICAL: Failed Redis update in finally: {e_redis}")
        if os.path.exists(original_video_temp_path):
            try: os.remove(original_video_temp_path); logger.info(f"[VideoTask {task_id}] Cleaned temp: {original_video_temp_path}")
            except OSError as e_rm: logger.error(f"[VideoTask {task_id}] Error removing temp: {e_rm}")

@celery.task(bind=True, name='api_app.transcode_audio_to_mp3_task', max_retries=3, default_retry_delay=60)
def transcode_audio_to_mp3_task(self, original_audio_temp_path, target_mp3_disk_path, media_id_for_update, batch_id_for_update, original_filename_for_log, disk_path_segment_for_batch, uploader_username_for_log):
    task_id = self.request.id; logger = current_app.logger
    logger.info(f"[AudioTask {task_id}] User:{uploader_username_for_log} Audio->MP3: {original_filename_for_log} (MediaID:{media_id_for_update})")
    ffmpeg_path = current_app.config.get('FFMPEG_PATH', 'ffmpeg')
    mp3_encoder = current_app.config.get('AUDIO_MP3_ENCODER'); mp3_options = current_app.config.get('AUDIO_MP3_OPTIONS')
    mp3_sample_rate = current_app.config.get('AUDIO_MP3_SAMPLE_RATE')
    ffmpeg_command = [ffmpeg_path, '-hide_banner', '-loglevel', 'error', '-i', original_audio_temp_path, '-c:a', mp3_encoder]
    ffmpeg_command.extend(mp3_options)
    if mp3_sample_rate: ffmpeg_command.extend(['-ar', mp3_sample_rate])
    ffmpeg_command.extend(['-f', 'mp3', '-y', target_mp3_disk_path])
    status_update = {'processing_status': 'failed', 'error_message': 'Unknown audio to MP3 error.'}
    try:
        logger.info(f"[AudioTask {task_id}] Executing: {' '.join(ffmpeg_command)}")
        subprocess.run(ffmpeg_command, check=True, capture_output=True, text=True, timeout=3600)
        logger.info(f"[AudioTask {task_id}] Success: {original_filename_for_log}")
        final_name = os.path.basename(target_mp3_disk_path)
        final_rpath = os.path.join(disk_path_segment_for_batch, final_name)
        status_update = {'filename_on_disk': final_name, 'filepath': final_rpath, 'mimetype': 'audio/mpeg', 'processing_status': 'completed', 'error_message': ''}
        get_app_data_redis_client().hmset(f'media:{media_id_for_update}', status_update)
        logger.info(f"[AudioTask {task_id}] Redis updated for MediaID {media_id_for_update}.")
        return {'status': 'success', 'output_path': target_mp3_disk_path, 'media_id': media_id_for_update}
    except subprocess.CalledProcessError as e:
        err_out = e.stderr.strip() if e.stderr else "No stderr."; logger.error(f"[AudioTask {task_id}] FAILED (rc {e.returncode}): {original_filename_for_log}. Error: {err_out}")
        status_update.update({'error_message': f'Audio conv. error (rc {e.returncode}): {err_out[:200]}'})
        if self.request.retries < self.max_retries: logger.info(f"[AudioTask {task_id}] Retrying ({self.request.retries + 1}/{self.max_retries})"); raise self.retry(exc=e, countdown=int(self.default_retry_delay * (2**self.request.retries)))
        raise
    except subprocess.TimeoutExpired as e:
        logger.error(f"[AudioTask {task_id}] TIMEOUT: {original_filename_for_log}"); status_update.update({'error_message': 'Audio conversion timeout.'})
        if self.request.retries < self.max_retries: logger.info(f"[AudioTask {task_id}] Retrying ({self.request.retries + 1}/{self.max_retries})"); raise self.retry(exc=e, countdown=int(self.default_retry_delay * (2**self.request.retries)))
        raise
    except Exception as e:
        logger.error(f"[AudioTask {task_id}] Unexpected error: {e}", exc_info=True); status_update.update({'error_message': f'Unexpected error: {str(e)[:100]}'}); raise
    finally:
        r_client = get_app_data_redis_client()
        try:
            if r_client.hget(f'media:{media_id_for_update}', 'processing_status') not in ['completed', 'completed_import']:
                r_client.hmset(f'media:{media_id_for_update}', status_update)
            logger.info(f"[AudioTask {task_id}] Final Redis status for MediaID {media_id_for_update}: {status_update.get('processing_status', 'N/A')}")
        except Exception as e_redis: logger.error(f"[AudioTask {task_id}] CRITICAL: Failed Redis update in finally: {e_redis}")
        if os.path.exists(original_audio_temp_path):
            try: os.remove(original_audio_temp_path); logger.info(f"[AudioTask {task_id}] Cleaned temp: {original_audio_temp_path}")
            except OSError as e_rm: logger.error(f"[AudioTask {task_id}] Error removing temp: {e_rm}")

@celery.task(bind=True, name='api_app.handle_zip_import_task', max_retries=1, default_retry_delay=60)
def handle_zip_import_task(self, uploaded_zip_filepath_on_disk, target_batch_id, uploader_username_for_log, original_zip_filename_for_log):
    task_id = self.request.id; logger = current_app.logger; app_config = current_app.config; task_redis_client = get_app_data_redis_client()
    logger.info(f"[ZIPImportTask {task_id}] User:{uploader_username_for_log} Import: {original_zip_filename_for_log} for BatchID:{target_batch_id}")
    batch_owner_username = task_redis_client.hget(f'batch:{target_batch_id}', 'user_id')
    if not batch_owner_username:
        logger.error(f"[ZIPImportTask {task_id}] No owner for batch {target_batch_id}. Aborting.");
        zip_item_id = task_redis_client.hget(f'batch_import_tracker:{target_batch_id}:{original_zip_filename_for_log}', 'zip_media_id')
        if zip_item_id: task_redis_client.hmset(f'media:{zip_item_id}', {'processing_status': 'failed_import', 'error_message': 'Batch owner not found.'})
        return {'status': 'error', 'message': 'Batch owner missing.'}
    disk_path_segment_for_batch = os.path.join(batch_owner_username, target_batch_id)
    full_disk_upload_dir_for_batch_contents = os.path.join(app_config['UPLOAD_FOLDER'], disk_path_segment_for_batch)
    os.makedirs(full_disk_upload_dir_for_batch_contents, exist_ok=True)
    
    # Create temp directory for zip extracts
    temp_extract_base_path = os.path.join(app_config['UPLOAD_FOLDER'], "temp_zip_extracts")
    os.makedirs(temp_extract_base_path, exist_ok=True)
    temp_extract_path_for_this_zip = os.path.join(temp_extract_base_path, f"import_{target_batch_id}_{uuid.uuid4().hex}")
    os.makedirs(temp_extract_path_for_this_zip, exist_ok=True)

    imported_media_count = 0; imported_blob_count = 0; manifest_data = None
    zip_item_id_from_tracker = task_redis_client.hget(f'batch_import_tracker:{target_batch_id}:{original_zip_filename_for_log}', 'zip_media_id')
    
    try:
        with zipfile.ZipFile(uploaded_zip_filepath_on_disk, 'r') as zip_ref:
            if 'lightbox_manifest.json' in zip_ref.namelist():
                with zip_ref.open('lightbox_manifest.json') as mf:
                    try: manifest_data = json.load(mf); logger.info(f"[ZIPImportTask {task_id}] Manifest loaded.")
                    except json.JSONDecodeError as e: logger.warning(f"[ZIPImportTask {task_id}] Manifest corrupted: {e}")
            redis_pipe = task_redis_client.pipeline()
            for member in zip_ref.infolist():
                if member.is_dir() or member.filename.startswith('__MACOSX') or member.filename.endswith('/'): continue
                member_zip_path = member.filename
                member_sane_basename = secure_filename(os.path.basename(member_zip_path))
                if not member_sane_basename: logger.warning(f"[ZIPImportTask {task_id}] Skipped empty filename in ZIP: {member_zip_path}"); continue
                
                extracted_temp_path = os.path.join(temp_extract_path_for_this_zip, member_sane_basename)
                # Basic path traversal check for zip extraction
                if not os.path.abspath(extracted_temp_path).startswith(os.path.abspath(temp_extract_path_for_this_zip)):
                    logger.error(f"[ZIPImportTask {task_id}] Path traversal attempt detected: {member_zip_path}. Skipping."); continue
                
                os.makedirs(os.path.dirname(extracted_temp_path), exist_ok=True) # Ensure subdir exists if zip has paths
                with zip_ref.open(member) as src, open(extracted_temp_path, "wb") as dest: shutil.copyfileobj(src, dest)
                
                orig_fname_redis = member_zip_path; desc_redis = ""; hidden_redis = '0'
                if manifest_data and 'files' in manifest_data:
                    for item_mf in manifest_data.get('files', []):
                        if item_mf.get('zip_path') == member_zip_path:
                            orig_fname_redis = item_mf.get('original_filename', member_zip_path)
                            desc_redis = item_mf.get('description', ''); hidden_redis = '1' if item_mf.get('is_hidden', False) else '0'; break
                
                base_sane, ext_dot = os.path.splitext(orig_fname_redis); ext_dot = ext_dot.lower(); item_id = str(uuid.uuid4())
                sec_base = secure_filename(base_sane) if base_sane else f"media_{item_id[:8]}" # Safer base for disk name
                
                common_data = {'original_filename': orig_fname_redis, 'filename_on_disk': "", 'filepath': "", 'mimetype': MIME_TYPE_MAP.get(ext_dot, 'application/octet-stream'), 'is_hidden': hidden_redis, 'is_liked': '0', 'uploader_user_id': uploader_username_for_log, 'batch_id': target_batch_id, 'upload_timestamp': datetime.datetime.now().timestamp(), 'description': desc_redis, 'item_type': 'media'}
                
                if is_media_for_processing(orig_fname_redis):
                    celery_input_path = extracted_temp_path
                    if ext_dot.lstrip('.') in app_config['VIDEO_FORMATS_TO_CONVERT_TO_MP4']:
                        target_path, _ = get_unique_disk_path_celery(full_disk_upload_dir_for_batch_contents, sec_base, ".mp4", task_id)
                        redis_pipe.hmset(f'media:{item_id}', {**common_data, 'filename_on_disk': os.path.basename(celery_input_path), 'filepath': os.path.join(disk_path_segment_for_batch, os.path.basename(celery_input_path)), 'processing_status': 'queued'})
                        convert_video_to_mp4_task.apply_async(args=[celery_input_path, target_path, item_id, target_batch_id, orig_fname_redis, disk_path_segment_for_batch, uploader_username_for_log])
                        imported_media_count += 1
                    elif ext_dot.lstrip('.') in app_config['AUDIO_FORMATS_TO_CONVERT_TO_MP3']:
                        target_path, _ = get_unique_disk_path_celery(full_disk_upload_dir_for_batch_contents, sec_base, ".mp3", task_id)
                        redis_pipe.hmset(f'media:{item_id}', {**common_data, 'filename_on_disk': os.path.basename(celery_input_path), 'filepath': os.path.join(disk_path_segment_for_batch, os.path.basename(celery_input_path)), 'processing_status': 'queued'})
                        transcode_audio_to_mp3_task.apply_async(args=[celery_input_path, target_path, item_id, target_batch_id, orig_fname_redis, disk_path_segment_for_batch, uploader_username_for_log])
                        imported_media_count += 1
                    else: # Image or other directly usable media format
                        final_path, final_name = get_unique_disk_path_celery(full_disk_upload_dir_for_batch_contents, sec_base, ext_dot, task_id)
                        shutil.move(extracted_temp_path, final_path) # Move from temp extract to final location
                        redis_pipe.hmset(f'media:{item_id}', {**common_data, 'filename_on_disk': final_name, 'filepath': os.path.join(disk_path_segment_for_batch, final_name), 'processing_status': 'completed'})
                        imported_media_count += 1
                else: # Non-media files (blobs) or unsupported media types
                    final_path, final_name = get_unique_disk_path_celery(full_disk_upload_dir_for_batch_contents, member_sane_basename, ext_dot, task_id)
                    shutil.move(extracted_temp_path, final_path)
                    redis_pipe.hmset(f'media:{item_id}', {**common_data, 'filename_on_disk': final_name, 'filepath': os.path.join(disk_path_segment_for_batch, final_name), 'processing_status': 'completed', 'item_type': 'blob'})
                    imported_blob_count += 1
                redis_pipe.rpush(f'batch:{target_batch_id}:media_ids', item_id)
            redis_pipe.execute()
            logger.info(f"[ZIPImportTask {task_id}] Imported {imported_media_count} media, {imported_blob_count} blobs into batch {target_batch_id}.")
            if zip_item_id_from_tracker: task_redis_client.hmset(f'media:{zip_item_id_from_tracker}', {'processing_status': 'completed_import', 'error_message': ''})
    except zipfile.BadZipFile:
        logger.error(f"[ZIPImportTask {task_id}] Bad ZIP file: {original_zip_filename_for_log}")
        if zip_item_id_from_tracker: task_redis_client.hmset(f'media:{zip_item_id_from_tracker}', {'processing_status': 'failed_import', 'error_message': 'Corrupted ZIP file.'})
    except Exception as e:
        logger.error(f"[ZIPImportTask {task_id}] Error processing ZIP {original_zip_filename_for_log}: {e}", exc_info=True)
        if zip_item_id_from_tracker: task_redis_client.hmset(f'media:{zip_item_id_from_tracker}', {'processing_status': 'failed_import', 'error_message': f'Import error: {str(e)[:100]}'})
    finally:
        # Cleanup temp extraction directory
        if os.path.exists(temp_extract_path_for_this_zip): shutil.rmtree(temp_extract_path_for_this_zip)
        # Remove tracker key from Redis if the import process is finalized (success/failure)
        if zip_item_id_from_tracker: task_redis_client.delete(f'batch_import_tracker:{target_batch_id}:{original_zip_filename_for_log}')
    return {'status': 'success', 'imported_media': imported_media_count, 'imported_blobs': imported_blob_count, 'batch_id': target_batch_id}


# --- Root Status Endpoint ---
@app.route('/')
def root_status():
    app.logger.info("Root path '/' accessed.")
    return jsonify(
        message="Frugal One Backend (Medium Test Version V3.0 - Full API Conversion)",
        status="API is running.",
        timestamp=datetime.datetime.utcnow().isoformat(),
        redis_status=redis_connection_message
    )

# --- Test User Setup Endpoint ---
@app.route('/setup_test_user', methods=['GET'])
def setup_test_user():
    if not redis_client:
        return jsonify(success=False, message="Redis not connected, cannot set up test user."), 503
    try:
        username = "ross"
        password = "password" # For local testing
        password_hash = generate_password_hash(password)
        
        pipe = redis_client.pipeline()
        pipe.sadd('users', username)
        pipe.hset(f'user:{username}', mapping={
            'password_hash': password_hash,
            'is_admin': '1',
            'email': 'ross@example.com' # Added email for potential future use
        })
        pipe.execute()
        app.logger.info(f"Test user '{username}' with password '{password}' created/updated in Redis.")
        return jsonify(success=True, message=f"User '{username}' with password '{password}' created/updated successfully."), 200
    except Exception as e:
        app.logger.error(f"Error creating/updating test user '{username}': {e}", exc_info=True)
        return jsonify(success=False, message=f"Error creating/updating user '{username}': {str(e)}"), 500


# --- Authentication Endpoints ---
@app.route(f'{API_PREFIX}/auth/status', methods=['GET', 'OPTIONS'])
def api_auth_status_check():
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    
    if 'username' in session:
        user_info = {"username": session['username'], "isAdmin": session.get('is_admin', False)}
        app.logger.info(f"API: GET {API_PREFIX}/auth/status - User '{user_info['username']}' IS logged in. Admin: {user_info['isAdmin']}")
        return jsonify(isLoggedIn=True, user=user_info, message="User is authenticated."), 200
    else:
        app.logger.info(f"API: GET {API_PREFIX}/auth/status - No active session.")
        return jsonify(isLoggedIn=False, user=None, message="User is not authenticated."), 200

@app.route(f'{API_PREFIX}/auth/login', methods=['POST', 'OPTIONS'])
def api_login_attempt():
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    
    app.logger.info(f"API: POST {API_PREFIX}/auth/login called")
    data = request.get_json()
    if not data:
        app.logger.warning(f"API: POST {API_PREFIX}/auth/login - No JSON data provided.")
        return jsonify(success=False, message="Login: Username and password are required."), 400
    
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        app.logger.warning(f"API: POST {API_PREFIX}/auth/login - Username or password missing.")
        return jsonify(success=False, message="Username and password are required."), 400

    app.logger.info(f"API: POST {API_PREFIX}/auth/login - Attempting login for user: '{username}'")

    if not redis_client:
        app.logger.error(f"API: POST {API_PREFIX}/auth/login - Redis client not available for user '{username}'.")
        return jsonify(success=False, message="Login service temporarily unavailable."), 503

    try:
        if not redis_client.sismember('users', username):
            app.logger.warning(f"API: POST {API_PREFIX}/auth/login - User '{username}' not found in 'users' set.")
            return jsonify(success=False, message="Invalid username or password."), 401

        user_data_key = f'user:{username}'
        user_redis_data = redis_client.hgetall(user_data_key)

        if not user_redis_data or 'password_hash' not in user_redis_data:
            app.logger.error(f"API: POST {API_PREFIX}/auth/login - User data or password_hash missing in Redis for '{username}'. Key: {user_data_key}")
            return jsonify(success=False, message="Invalid username or password."), 401

        stored_password_hash = user_redis_data['password_hash']
        if check_password_hash(stored_password_hash, password):
            session.clear() # Clear any existing session data
            session['username'] = username
            session['is_admin'] = user_redis_data.get('is_admin') == '1'
            session.permanent = True # Session will last for app.permanent_session_lifetime (default 31 days)
            
            user_info_for_frontend = {"username": username, "isAdmin": session['is_admin']}
            app.logger.info(f"API: POST {API_PREFIX}/auth/login - Login SUCCESSFUL for user: '{username}'. Admin: {session['is_admin']}")
            return jsonify(success=True, message="Login successful!", user=user_info_for_frontend), 200
        else:
            app.logger.warning(f"API: POST {API_PREFIX}/auth/login - Invalid password for user: '{username}'")
            return jsonify(success=False, message="Invalid username or password."), 401

    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: POST {API_PREFIX}/auth/login - Redis error for user '{username}': {e}")
        return jsonify(success=False, message="Login failed due to a database error."), 500
    except Exception as e:
        app.logger.error(f"API: POST {API_PREFIX}/auth/login - Unexpected error for user '{username}': {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected error occurred during login."), 500

@app.route(f'{API_PREFIX}/auth/logout', methods=['POST', 'OPTIONS'])
def api_logout():
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    
    username_in_session = session.pop('username', None)
    session.pop('is_admin', None)
    session.clear() # Clears all session cookies.
    
    if username_in_session:
        app.logger.info(f"API: POST {API_PREFIX}/auth/logout - User '{username_in_session}' logged out.")
    else:
        app.logger.info(f"API: POST {API_PREFIX}/auth/logout - No active session to logout.")
    return jsonify(success=True, message="Logout successful."), 200

@app.route(f'{API_PREFIX}/auth/register', methods=['POST', 'OPTIONS'])
def api_register():
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS

    if session.get('username'): # User already logged in, cannot register
        return jsonify(success=False, message="Already logged in."), 409 # Conflict

    if not redis_client:
        return jsonify(success=False, message="Registration service unavailable."), 503

    data = request.get_json()
    if not data:
        return jsonify(success=False, message="Username, password, and confirmation required."), 400

    username = data.get('username', '').strip()
    password = data.get('password')
    confirm_password = data.get('confirm_password')

    if not all([username, password, confirm_password]):
        return jsonify(success=False, message="All fields (username, password, confirm_password) are required."), 400
    
    if len(username) < 3:
        return jsonify(success=False, message="Username too short (min 3 characters)."), 400
    
    if password != confirm_password:
        return jsonify(success=False, message="Passwords do not match."), 400
    
    if len(password) < 8:
        return jsonify(success=False, message="Password too short (min 8 characters)."), 400
    
    try:
        if redis_client.sismember('users', username):
            return jsonify(success=False, message="Username already exists."), 409 # Conflict
        
        pipe = redis_client.pipeline()
        pipe.sadd('users', username)
        pipe.hset(f'user:{username}', mapping={'password_hash': generate_password_hash(password), 'is_admin': '0'})
        pipe.execute()
        
        app.logger.info(f"API: New user registered: {username}")
        return jsonify(success=True, message="Registration successful! Please log in."), 201 # Created
    
    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error during registration for {username}: {e}", exc_info=True)
        return jsonify(success=False, message="Registration failed due to a database error."), 500
    except Exception as e:
        app.logger.error(f"API: Unexpected error during registration for {username}: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected error occurred during registration."), 500

# --- User Batch (Lightbox) Management Endpoints ---

@app.route(f'{API_PREFIX}/batches', methods=['GET', 'OPTIONS'])
@login_required_api
def api_list_batches():
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS

    if not redis_client:
        app.logger.error("API: GET /batches - Redis client not available.")
        return jsonify(success=False, message="Service unavailable to list Lightboxes."), 503
    
    username = session['username']
    app.logger.info(f"API: GET /batches - User '{username}' requesting batch list.")

    try:
        batch_ids = redis_client.lrange(f'user:{username}:batches', 0, -1)
        
        batches_data_list = []
        for batch_id_str in batch_ids:
            batch_info = redis_client.hgetall(f'batch:{batch_id_str}')
            if batch_info:
                batch_info['id'] = batch_id_str
                # Ensure count is an int
                batch_info['item_count'] = redis_client.llen(f'batch:{batch_id_str}:media_ids')
                
                # Convert timestamps to float for consistent JSON
                for key in ['creation_timestamp', 'last_modified_timestamp']:
                    if key in batch_info and batch_info[key]:
                        batch_info[key] = float(batch_info[key])
                
                # Convert '0'/'1' strings to actual booleans for 'is_shared'
                batch_info['is_shared'] = batch_info.get('is_shared') == '1'
                
                batches_data_list.append(batch_info)
        
        batches_data_list.sort(key=lambda x: x.get('creation_timestamp', 0.0), reverse=True)

        app.logger.info(f"API: GET /batches - User '{username}' retrieved {len(batches_data_list)} Lightboxes.")
        return jsonify(success=True, batches=batches_data_list), 200

    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: GET /batches - Redis error for user '{username}': {e}", exc_info=True)
        return jsonify(success=False, message="Error retrieving Lightboxes from database."), 500
    except Exception as e:
        app.logger.error(f"API: GET /batches - Unexpected error for user '{username}': {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred while listing Lightboxes."), 500

@app.route(f'{API_PREFIX}/batches', methods=['POST', 'OPTIONS'])
@login_required_api
def api_create_batch():
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS

    if not redis_client:
        app.logger.error("API: POST /batches - Redis client not available.")
        return jsonify(success=False, message="Service unavailable to create Lightbox."), 503

    data = request.get_json()
    if not data:
        app.logger.warning("API: POST /batches - No JSON data provided for batch creation.")
        return jsonify(success=False, message="No data provided. Please send JSON with 'name'."), 400
    
    batch_name = data.get('name', '').strip()
    if not batch_name:
        app.logger.warning("API: POST /batches - Batch name is empty.")
        return jsonify(success=False, message="Lightbox name cannot be empty."), 400
    if len(batch_name) > 255:
        app.logger.warning(f"API: POST /batches - Batch name too long: {batch_name[:200]}...")
        return jsonify(success=False, message="Lightbox name is too long (max 255 characters)."), 400

    current_username = session['username']
    batch_id = str(uuid.uuid4())
    current_timestamp = datetime.datetime.now().timestamp()

    try:
        batch_data = {
            'id': batch_id,
            'name': batch_name,
            'user_id': current_username,
            'creation_timestamp': current_timestamp,
            'last_modified_timestamp': current_timestamp,
            'is_shared': '0',
            'share_token': ''
        }
        redis_client.hset(f'batch:{batch_id}', mapping=batch_data)
        redis_client.rpush(f'user:{current_username}:batches', batch_id)

        app.logger.info(f"API: POST /batches - User '{current_username}' created new Lightbox '{batch_name}' (ID: {batch_id}).")
        return jsonify(
            success=True,
            message=f"Lightbox '{batch_name}' created successfully.",
            batch=batch_data
        ), 201

    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: POST /batches - Redis error for user '{current_username}' creating batch: {e}", exc_info=True)
        return jsonify(success=False, message="Error creating Lightbox in database."), 500
    except Exception as e:
        app.logger.error(f"API: POST /batches - Unexpected error for user '{current_username}' creating batch: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred while creating Lightbox."), 500

@app.route(f'{API_PREFIX}/batches/<uuid:batch_id>', methods=['GET', 'OPTIONS'])
@owner_or_admin_access_required_api(item_type='batch')
def api_get_batch_details(batch_id, batch_data):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS

    if not redis_client:
        app.logger.error("API: Database service unavailable for fetching batch details.")
        return jsonify(success=False, message="Database service temporarily unavailable."), 503

    batch_id_str = str(batch_id)
    batch_info_raw = batch_data # Data already fetched and validated by decorator

    # Convert raw Redis hash to a more suitable JSON structure
    batch_info = {
        'id': batch_id_str,
        'name': batch_info_raw.get('name'),
        'user_id': batch_info_raw.get('user_id'),
        'creation_timestamp': float(batch_info_raw.get('creation_timestamp', 0)),
        'last_modified_timestamp': float(batch_info_raw.get('last_modified_timestamp', 0)) if batch_info_raw.get('last_modified_timestamp') else 0,
        'is_shared': batch_info_raw.get('is_shared') == '1',
        'share_token': batch_info_raw.get('share_token')
    }

    media_ids = redis_client.lrange(f'batch:{batch_id_str}:media_ids', 0, -1)
    media_list = []
    for mid in media_ids:
        mdata_raw = redis_client.hgetall(f'media:{mid}')
        if mdata_raw:
            # Prepare media data for JSON response
            media_item = {
                'id': mid,
                'original_filename': mdata_raw.get('original_filename'),
                'filename_on_disk': mdata_raw.get('filename_on_disk'),
                'filepath': mdata_raw.get('filepath'), # Relative path like user/batch_id/filename.ext
                'mimetype': mdata_raw.get('mimetype'),
                'is_hidden': mdata_raw.get('is_hidden', '0') == '1',
                'is_liked': mdata_raw.get('is_liked', '0') == '1',
                'uploader_user_id': mdata_raw.get('uploader_user_id'),
                'batch_id': mdata_raw.get('batch_id'),
                'upload_timestamp': float(mdata_raw.get('upload_timestamp', 0)),
                'description': mdata_raw.get('description', ''), # Added description field
                'item_type': mdata_raw.get('item_type', 'media'),
                'processing_status': mdata_raw.get('processing_status', 'completed')
            }

            # Construct URLs for frontend use, pointing to API endpoints for media
            if media_item['filepath'] and media_item['processing_status'] == 'completed':
                media_item['web_url'] = url_for('api_display_media_item', media_id=mid, _external=True)
                media_item['download_url'] = url_for('api_download_media_item', media_id=mid, _external=True)
            else:
                media_item['download_url'] = None
                media_item['web_url'] = None # Will be null if file not ready or not found
            media_list.append(media_item)
        else:
            app.logger.warning(f"API: Media ID {mid} in batch {batch_id_str} but no data in Redis.")

    batch_info['media_items'] = media_list
    batch_info['item_count'] = len(media_ids) # Total items in Redis list (including those not fully processed)
    batch_info['playable_media_count'] = sum(1 for item in media_list if item['web_url'] and item['item_type'] == 'media' and not item['is_hidden']) # Count of actual media for slideshow

    app.logger.info(f"API: User '{session['username']}' fetched details for batch '{batch_id_str}'.")
    return jsonify(success=True, batch=batch_info), 200

@app.route(f'{API_PREFIX}/batches/<uuid:batch_id>/toggle_share', methods=['POST', 'OPTIONS'])
@login_required_api
@owner_or_admin_access_required_api(item_type='batch')
def api_toggle_share_batch(batch_id, batch_data):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: return jsonify(success=False, message="DB unavailable."), 503

    batch_id_str = str(batch_id)
    token = batch_data.get('share_token')
    shared_str = batch_data.get('is_shared', '0')
    
    new_shared = not (shared_str == '1') # Flip the current status
    update = {'is_shared': '1' if new_shared else '0', 'last_modified_timestamp': datetime.datetime.now().timestamp()}
    
    pipe = redis_client.pipeline()

    if new_shared: # If enabling sharing
        if not token: # Generate new token if none exists
            token = secrets.token_urlsafe(24)
            update['share_token'] = token
            pipe.set(f'share_token:{token}', batch_id_str) # Map token to batch_id
        else:
            # If token already exists, ensure it's still mapped to the batch ID (refresh TTL)
            pipe.set(f'share_token:{token}', batch_id_str) 
    else: # If disabling sharing
        if token:
            pipe.delete(f'share_token:{token}') # Delete the token mapping
            update['share_token'] = '' # Clear token from batch data
            
    pipe.hmset(f'batch:{batch_id_str}', update)
    
    try:
        pipe.execute()
        name = batch_data.get('name', batch_id_str)
        app.logger.info(f"API: Batch '{name}' (ID: {batch_id_str}) sharing changed to: {'Public' if new_shared else 'Private'}")
        
        response_data = {
            "success": True,
            "message": f"Lightbox '{name}' is now {'Public' if new_shared else 'Private'}.",
            "batch_id": batch_id_str,
            "is_shared": new_shared,
            "share_token": token if new_shared else None
        }
        if new_shared and token:
            response_data["public_share_url"] = url_for('api_public_batch_view', share_token=token, _external=True)
            response_data["public_slideshow_url"] = url_for('api_public_slideshow_view', share_token=token, _external=True)
        
        return jsonify(response_data), 200

    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error toggling share for batch {batch_id_str}: {e}", exc_info=True)
        return jsonify(success=False, message="Database error during share toggle."), 500
    except Exception as e:
        app.logger.error(f"API: Unexpected error toggling share for batch {batch_id_str}: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred during share toggle."), 500

@app.route(f'{API_PREFIX}/batches/<uuid:batch_id>/rename', methods=['POST', 'OPTIONS'])
@login_required_api
@owner_or_admin_access_required_api(item_type='batch')
def api_rename_batch(batch_id, batch_data):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: return jsonify({'success': False, 'message': 'DB unavailable.'}), 503

    batch_id_str = str(batch_id)
    data = request.get_json()
    if not data: return jsonify(success=False, message="No data provided."), 400
    
    new_name = data.get('new_name','').strip()
    if not new_name: return jsonify({'success':False,'message':'New name cannot be empty.'}),400
    if len(new_name) > 255: return jsonify({'success':False,'message':'New name is too long (max 255 characters).'}),400
    
    old_name = batch_data.get('name','Unnamed');
    if old_name == new_name: return jsonify({'success':True,'message':'Name unchanged.','new_name':new_name}),200
    
    try:
        pipe = redis_client.pipeline()
        pipe.hset(f'batch:{batch_id_str}','name',new_name)
        pipe.hset(f'batch:{batch_id_str}','last_modified_timestamp',datetime.datetime.now().timestamp())
        pipe.execute()
        
        current_app.logger.info(f"API: Batch '{old_name}' (ID: {batch_id_str}) renamed to '{new_name}' by {session.get('username')}")
        return jsonify({'success':True,'message':'Lightbox renamed.','new_name':new_name, 'batch_id': batch_id_str}),200
    
    except redis.exceptions.RedisError as e:
        current_app.logger.error(f"API: Redis rename error for batch {batch_id_str}: {e}", exc_info=True)
        return jsonify({'success':False,'message':'Database error during rename.'}),500
    except Exception as e:
        current_app.logger.error(f"API: Unexpected error renaming batch {batch_id_str}: {e}", exc_info=True)
        return jsonify({'success':False,'message':'An unexpected server error occurred during rename.'}),500


@app.route(f'{API_PREFIX}/batches/<uuid:batch_id>', methods=['DELETE', 'OPTIONS']) # RESTful DELETE
@login_required_api
@owner_or_admin_access_required_api(item_type='batch')
def api_delete_batch(batch_id, batch_data):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: return jsonify(success=False, message="DB unavailable."), 503

    batch_id_str = str(batch_id)
    name_flash = batch_data.get('name',batch_id_str)
    owner_id = batch_data.get('user_id')

    try:
        media_ids = redis_client.lrange(f'batch:{batch_id_str}:media_ids',0,-1)
        pipe = redis_client.pipeline()
        
        # Delete media metadata from Redis
        if media_ids:
            for m_id in media_ids:
                m_info = redis_client.hgetall(f'media:{m_id}')
                pipe.delete(f'media:{m_id}')
                if m_info.get('item_type')=='archive_import' and m_info.get('original_filename'):
                    pipe.delete(f'batch_import_tracker:{batch_id_str}:{m_info.get("original_filename")}')
        
        # Delete batch metadata from Redis
        pipe.delete(f'batch:{batch_id_str}:media_ids')
        pipe.delete(f'batch:{batch_id_str}')
        
        # Delete share token if it exists
        if batch_data.get('share_token'):
            pipe.delete(f"share_token:{batch_data['share_token']}")
        
        # Remove batch ID from user's list of batches
        if owner_id:
            pipe.lrem(f'user:{owner_id}:batches',0,batch_id_str)
        
        pipe.execute()
        app.logger.info(f"API: Batch {batch_id_str} metadata deleted from Redis for user '{owner_id}'.")
        
        # Delete files from disk
        if owner_id:
            batch_dir = os.path.join(app.config['UPLOAD_FOLDER'], owner_id, batch_id_str)
            if os.path.isdir(batch_dir):
                try:
                    shutil.rmtree(batch_dir)
                    app.logger.info(f"API: Deleted batch directory: {batch_dir}")
                except OSError as e:
                    app.logger.error(f"API: OS error deleting batch directory {batch_dir}: {e}", exc_info=True)
                    return jsonify(success=False, message=f"Lightbox '{name_flash}' deleted from DB, but error deleting files on server: {str(e)}"), 500
            else:
                app.logger.info(f"API: Batch directory not found for deletion: {batch_dir}")
        else:
            app.logger.error(f"API: No owner ID for batch {batch_id_str} when attempting file deletion.")
            return jsonify(success=False, message=f"Lightbox '{name_flash}' deleted from DB, but could not determine file path for deletion."), 500
        
        return jsonify(success=True, message=f'Lightbox "{name_flash}" and its contents deleted.'), 200 # OK

    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error deleting batch {batch_id_str}: {e}", exc_info=True)
        return jsonify(success=False, message="Database error during Lightbox deletion."), 500
    except Exception as e:
        app.logger.error(f"API: Unexpected error deleting batch {batch_id_str}: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred during Lightbox deletion."), 500


# --- Media Item Management Endpoints ---

@app.route(f'{API_PREFIX}/upload', methods=['POST', 'OPTIONS'])
@login_required_api
def api_upload():
    # This check handles CORS preflight requests.
    # For OPTIONS requests, request.files and request.form are empty, so no further processing is needed.
    if request.method == 'OPTIONS': 
        return '', 204
    
    # --- START OF CRUCIAL LOGGING LINES (correctly placed inside the function) ---
    # These will tell us what Flask sees in the incoming request.
    app.logger.info(f"API: Upload request received. Content-Type: {request.headers.get('Content-Type')}")
    app.logger.info(f"API: Request files: {request.files}")
    app.logger.info(f"API: Request form data: {request.form}")
    app.logger.info(f"API: 'files[]' in request.files check: {'files[]' in request.files}")
    # --- END OF CRUCIAL LOGGING LINES ---

    if not redis_client:
        return jsonify(success=False, message="Upload service unavailable (DB error)."), 503
    
    # Check if the 'files[]' part exists in the request files
    # This is the first check for a 400 Bad Request, often if the frontend doesn't attach files correctly
    if 'files[]' not in request.files:
        app.logger.warning("API: 'files[]' not found in request.files. Returning 400 (No file part).")
        return jsonify(success=False, message="No file part in the request or request malformed."), 400
    
    # Get the list of files associated with 'files[]'
    files = request.files.getlist('files[]')
    
    # Check if the list of files is empty or if all files have empty filenames
    # This is the second check for a 400 Bad Request, common if user submits empty file input
    if not files or all(f.filename == '' for f in files):
        app.logger.warning("API: Files list is empty or all filenames are empty. Returning 400 (No files selected).")
        return jsonify(success=False, message="No files selected for upload."), 400

    current_user = session['username']
    existing_batch_id = request.form.get('existing_batch_id')
    upload_type = request.form.get('upload_type', 'media')
    description = request.form.get('description', '').strip()

    app.logger.info(f"API: Upload by {current_user}. Type: {upload_type}. Files count: {len(files)}")

    batch_id, batch_name, new_batch, batch_owner = "", "", True, current_user
    if existing_batch_id:
        new_batch = False
        batch_id = existing_batch_id
        try:
            b_info = redis_client.hgetall(f'batch:{batch_id}')
            if not b_info:
                return jsonify(success=False, message=f'Lightbox {batch_id} not found.'), 404
            batch_owner = b_info.get('user_id')
            if not batch_owner:
                app.logger.error(f"API: Batch {batch_id} missing owner in Redis.")
                return jsonify(success=False, message='Lightbox data error.'), 500
            if batch_owner != current_user and not session.get('is_admin'):
                return jsonify(success=False, message='No permission to upload to this Lightbox.'), 403
            batch_name = b_info.get('name', f'Lightbox_{batch_id[:8]}')
        except redis.exceptions.RedisError as e:
            app.logger.error(f"API: Redis error checking existing batch {batch_id}: {e}", exc_info=True)
            return jsonify(success=False, message="Database error during batch lookup."), 500
    else: # Create new batch if no existing ID is provided
        new_batch = True
        batch_id = str(uuid.uuid4())
        batch_name_form = request.form.get('batch_name', '').strip()
        if upload_type == 'import_zip' and not batch_name_form and files and files[0].filename:
            zip_base, _ = os.path.splitext(files[0].filename)
            batch_name = secure_filename(zip_base) if zip_base else f"Import_{batch_id[:8]}"
        elif batch_name_form:
            batch_name = batch_name_form
        else: # Fallback for new batch if no name provided for non-zip imports
            batch_name = f"New Lightbox_{batch_id[:8]}"
            
    disk_path_segment = os.path.join(batch_owner, batch_id)
    full_disk_dir = os.path.join(app.config['UPLOAD_FOLDER'], disk_path_segment) # Use absolute path directly
    
    try:
        os.makedirs(full_disk_dir, exist_ok=True)
    except OSError as e:
        app.logger.error(f"API: Error creating upload directory '{full_disk_dir}': {e}", exc_info=True)
        return jsonify(success=False, message="Server directory error during upload."), 500

    direct_count, convert_queued_count, import_queued_count, blob_count = 0, 0, 0, 0
    uploaded_items_meta = [] # To return details of uploaded items
    redis_pipe = redis_client.pipeline()

    vid_formats = app.config['VIDEO_FORMATS_TO_CONVERT_TO_MP4']
    aud_formats = app.config['AUDIO_FORMATS_TO_CONVERT_TO_MP3']

    for file_item in files:
        if not file_item or not file_item.filename:
            continue

        orig_fname = file_item.filename
        if not allowed_file(orig_fname):
            app.logger.warning(f"API: File type '{orig_fname}' not allowed. Skipped.")
            uploaded_items_meta.append({"filename": orig_fname, "status": "skipped", "message": "File type not allowed."})
            continue
        
        base, ext_dot = os.path.splitext(orig_fname)
        ext_dot = ext_dot.lower()
        ext_no_dot = ext_dot.lstrip('.')
        
        item_id = str(uuid.uuid4())
        sec_base = secure_filename(base) if base else f"item_{item_id[:8]}"
        
        temp_input_fname = f"{item_id}_input{ext_dot}"
        temp_input_path = os.path.join(full_disk_dir, temp_input_fname)
        initial_rpath_temp = os.path.join(disk_path_segment, temp_input_fname)

        common_data = {
            'original_filename': orig_fname,
            'filename_on_disk': "", # Will be set later
            'filepath': "",         # Will be set later
            'mimetype': MIME_TYPE_MAP.get(ext_dot, 'application/octet-stream'),
            'is_hidden': '0',
            'is_liked': '0',
            'uploader_user_id': current_user,
            'batch_id': batch_id,
            'upload_timestamp': datetime.datetime.now().timestamp(),
            'item_type': 'media', # Default, overridden for blobs/archives
            'description': description # Use the provided description
        }

        try:
            if upload_type == 'import_zip' and ext_no_dot == 'zip':
                app.logger.info(f"API: Queuing ZIP '{orig_fname}' for import. ItemID: {item_id}")
                file_item.save(temp_input_path)
                redis_pipe.hmset(f'media:{item_id}', {
                    **common_data, 
                    'filename_on_disk': temp_input_fname,
                    'filepath': initial_rpath_temp,
                    'processing_status': 'queued_import', 
                    'item_type': 'archive_import'
                })
                redis_pipe.hmset(f'batch_import_tracker:{batch_id}:{orig_fname}', {'zip_media_id': item_id})
                handle_zip_import_task.apply_async(args=[temp_input_path, batch_id, current_user, orig_fname])
                import_queued_count += 1
                uploaded_items_meta.append({"id": item_id, "filename": orig_fname, "status": "queued_import", "message": "ZIP import queued."})
            elif upload_type == 'blob_storage' or not is_media_for_processing(orig_fname):
                app.logger.info(f"API: Storing blob: '{orig_fname}'. ItemID: {item_id}")
                final_path, final_name = get_unique_disk_path(full_disk_dir, sec_base, ext_dot)
                file_item.save(final_path)
                redis_pipe.hmset(f'media:{item_id}', {
                    **common_data, 
                    'filename_on_disk': final_name,
                    'filepath': os.path.join(disk_path_segment, final_name),
                    'processing_status': 'completed', 
                    'item_type': 'blob'
                })
                blob_count += 1
                uploaded_items_meta.append({"id": item_id, "filename": orig_fname, "status": "completed", "message": "File stored as blob."})
            elif upload_type == 'media' and is_media_for_processing(orig_fname):
                if ext_no_dot in vid_formats:
                    file_item.save(temp_input_path)
                    target_path, _ = get_unique_disk_path(full_disk_dir, sec_base, ".mp4")
                    redis_pipe.hmset(f'media:{item_id}', {
                        **common_data, 
                        'filename_on_disk': temp_input_fname,
                        'filepath': initial_rpath_temp, # Temp path on disk initially
                        'processing_status': 'queued'
                    })
                    convert_video_to_mp4_task.apply_async(args=[temp_input_path, target_path, item_id, batch_id, orig_fname, disk_path_segment, current_user])
                    convert_queued_count += 1
                    uploaded_items_meta.append({"id": item_id, "filename": orig_fname, "status": "queued", "message": "Video conversion queued."})
                elif ext_no_dot in aud_formats:
                    file_item.save(temp_input_path)
                    target_path, _ = get_unique_disk_path(full_disk_dir, sec_base, ".mp3")
                    redis_pipe.hmset(f'media:{item_id}', {
                        **common_data, 
                        'filename_on_disk': temp_input_fname,
                        'filepath': initial_rpath_temp, # Temp path on disk initially
                        'processing_status': 'queued'
                    })
                    transcode_audio_to_mp3_task.apply_async(args=[temp_input_path, target_path, item_id, batch_id, orig_fname, disk_path_segment, current_user])
                    convert_queued_count += 1
                    uploaded_items_meta.append({"id": item_id, "filename": orig_fname, "status": "queued", "message": "Audio conversion queued."})
                else: # Directly store other media types (images, pdfs, etc.)
                    final_path, final_name = get_unique_disk_path(full_disk_dir, sec_base, ext_dot)
                    file_item.save(final_path)
                    redis_pipe.hset(f'media:{item_id}', mapping={ # Add mapping= for clarity with hset
                        **common_data, 
                        'filename_on_disk': final_name,
                        'filepath': os.path.join(disk_path_segment, final_name),
                        'processing_status': 'completed'
                    })
                    direct_count += 1
                    uploaded_items_meta.append({"id": item_id, "filename": orig_fname, "status": "completed", "message": "Media uploaded directly."})
            else:
                app.logger.warning(f"API: Could not handle '{orig_fname}'. Skipped.")
                uploaded_items_meta.append({"filename": orig_fname, "status": "skipped", "message": "Unknown processing type."})
                continue
            
            # Add media ID to batch list in Redis
            redis_pipe.rpush(f'batch:{batch_id}:media_ids', item_id)

        except Exception as e:
            app.logger.error(f"API: Error processing '{orig_fname}' (type:{upload_type}): {e}", exc_info=True)
            uploaded_items_meta.append({"filename": orig_fname, "status": "error", "message": f"Server error: {str(e)}"})
            if os.path.exists(temp_input_path):
                try: os.remove(temp_input_path)
                except OSError: app.logger.error(f"Failed to cleanup temp file during upload error: {temp_input_path}")
    
    try:
        redis_pipe.execute()
    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis pipeline error during upload for batch {batch_id}: {e}", exc_info=True)
        return jsonify(success=False, message="Database error during upload finalization."), 500

    total_submitted = direct_count + convert_queued_count + import_queued_count + blob_count
    if total_submitted > 0:
        try:
            if new_batch:
                redis_client.hset(f'batch:{batch_id}', mapping={
                    'user_id': batch_owner,
                    'creation_timestamp': datetime.datetime.now().timestamp(),
                    'name': batch_name,
                    'is_shared': '0',
                    'share_token': ''
                })
                redis_client.lpush(f'user:{batch_owner}:batches', batch_id) # Add new batch to user's list
            else:
                redis_client.hset(f'batch:{batch_id}', 'last_modified_timestamp', datetime.datetime.now().timestamp())
            
            summary_message = f'{total_submitted} item(s) processed for "{batch_name}". '
            if convert_queued_count: summary_message += f"{convert_queued_count} media processing. "
            if import_queued_count: summary_message += f"{import_queued_count} archive(s) importing. "
            if blob_count: summary_message += f"{blob_count} file(s) stored. "

            return jsonify(
                success=True,
                message=summary_message.strip(),
                batch_id=batch_id,
                batch_name=batch_name,
                uploaded_items=uploaded_items_meta
            ), 200 # Or 201 if creating a new resource, but here we are adding to existing or newly created batch
        
        except redis.exceptions.RedisError as e:
            app.logger.error(f"API: Redis error finalizing batch {batch_id} after upload: {e}", exc_info=True)
            return jsonify(success=False, message="Items submitted, but error saving batch metadata."), 500
    else:
        # If no valid files were processed and a new batch was attempted, clean up.
        if new_batch and os.path.exists(full_disk_dir) and not os.listdir(full_disk_dir):
            try: shutil.rmtree(full_disk_dir)
            except OSError as e_rmdir: app.logger.error(f"API: Error removing empty new batch dir '{full_disk_dir}': {e_rmdir}")
        return jsonify(success=False, message="No valid files processed or uploaded."), 400
@app.route(f'{API_PREFIX}/media/<uuid:media_id>/toggle_hidden', methods=['POST', 'OPTIONS'])
@login_required_api
@owner_or_admin_access_required_api(item_type='media')
def api_toggle_hidden(media_id, media_data):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: return jsonify(success=False, message="DB unavailable."), 503

    media_id_str = str(media_id)
    # This action is typically only for actual media items that appear in slideshows
    if media_data.get('item_type','media') != 'media':
        return jsonify(success=False, message="Action only applicable to media items (not blobs or imports)."), 400
    
    try:
        new_status = '0' if media_data.get('is_hidden','0') == '1' else '1'
        redis_client.hset(f'media:{media_id_str}','is_hidden',new_status)
        
        return jsonify(
            success=True,
            message=f"Media '{media_data.get('original_filename',media_id_str)}' is now {'visible' if new_status=='0' else 'hidden'}.",
            media_id=media_id_str,
            is_hidden=new_status == '1'
        ), 200
    
    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error toggling hidden status for media {media_id_str}: {e}", exc_info=True)
        return jsonify(success=False, message="Database error toggling visibility."), 500
    except Exception as e:
        app.logger.error(f"API: Unexpected error toggling hidden status for media {media_id_str}: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred."), 500

@app.route(f'{API_PREFIX}/media/<uuid:media_id>/toggle_liked', methods=['POST', 'OPTIONS'])
@login_required_api
@owner_or_admin_access_required_api(item_type='media')
def api_toggle_liked(media_id, media_data):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: return jsonify(success=False, message="DB unavailable."), 503

    media_id_str = str(media_id)
    if media_data.get('item_type','media') != 'media':
        return jsonify(success=False, message="Action only applicable to media items (not blobs or imports)."), 400

    try:
        new_status = '0' if media_data.get('is_liked','0') == '1' else '1'
        redis_client.hset(f'media:{media_id_str}','is_liked',new_status)
        
        return jsonify(
            success=True,
            message=f"Media '{media_data.get('original_filename',media_id_str)}' {'unliked' if new_status=='0' else 'liked'}.",
            media_id=media_id_str,
            is_liked=new_status == '1'
        ), 200
    
    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error toggling liked status for media {media_id_str}: {e}", exc_info=True)
        return jsonify(success=False, message="Database error toggling like status."), 500
    except Exception as e:
        app.logger.error(f"API: Unexpected error toggling liked status for media {media_id_str}: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred."), 500

@app.route(f'{API_PREFIX}/media/<uuid:media_id>', methods=['DELETE', 'OPTIONS']) # RESTful DELETE
@login_required_api
@owner_or_admin_access_required_api(item_type='media')
def api_delete_media(media_id, media_data):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: return jsonify(success=False, message="DB unavailable."), 503
    
    media_id_str = str(media_id)
    batch_id_contained_in = media_data.get('batch_id') # Get batch_id from media_data, not from URL
    orig_fname = media_data.get('original_filename',media_id_str)
    item_type = media_data.get('item_type','media')

    try:
        filepath_redis = media_data.get('filepath')
        if filepath_redis:
            # Construct absolute path to the file on disk
            disk_path = os.path.join(app.config['UPLOAD_FOLDER'], filepath_redis)
            if os.path.isfile(disk_path):
                try:
                    os.remove(disk_path)
                    app.logger.info(f"API: Deleted file {disk_path} for item {media_id_str} (type: {item_type})")
                except OSError as e:
                    app.logger.error(f"API: OS error deleting file {disk_path} for media {media_id_str}: {e}", exc_info=True)
                    # Don't return error immediately, try to delete Redis data anyway
        
        pipe = redis_client.pipeline()
        if batch_id_contained_in: # Remove from batch's media_ids list
            pipe.lrem(f'batch:{batch_id_contained_in}:media_ids',0,media_id_str)
        pipe.delete(f'media:{media_id_str}') # Delete media hash
        
        if item_type == 'archive_import' and batch_id_contained_in:
            pipe.delete(f'batch_import_tracker:{batch_id_contained_in}:{orig_fname}')
        
        pipe.execute()
        app.logger.info(f"API: Media '{orig_fname}' (ID: {media_id_str}) metadata deleted from Redis.")
        
        return jsonify(
            success=True,
            message=f"Item '{orig_fname}' deleted.",
            media_id=media_id_str,
            batch_id=batch_id_contained_in # Return batch ID for frontend to update view
        ), 200
    
    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error deleting media item {media_id_str}: {e}", exc_info=True)
        return jsonify(success=False, message="Database error during media item deletion."), 500
    except Exception as e:
        app.logger.error(f"API: Unexpected error deleting media item {media_id_str}: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred during media item deletion."), 500

@app.route(f'{API_PREFIX}/media/<uuid:media_id>/display', methods=['GET', 'OPTIONS'])
@login_required_api
@owner_or_admin_access_required_api(item_type='media')
def api_display_media_item(media_id, media_data):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: abort(503, description="DB unavailable.")

    rpath = media_data.get('filepath'); orig_fname = media_data.get('original_filename', f"display_{media_id}.bin")
    mime = media_data.get('mimetype', 'application/octet-stream')
    
    if not rpath:
        app.logger.error(f"API: Display item {media_id} failed: No filepath in Redis.")
        abort(404, description="File information missing.")

    dpath = os.path.join(app.config['UPLOAD_FOLDER'], rpath)
    if not os.path.isfile(dpath):
        app.logger.error(f"API: Display item {media_id} (path: {dpath}) failed: File not found on disk.")
        abort(404, description="File not found on server.")
    
    app.logger.info(f"API: User '{session['username']}' serving/displaying '{orig_fname}' (ID: {media_id})")
    try:
        # as_attachment=False means the browser will try to display it inline
        return send_file(dpath, mimetype=mime, as_attachment=False, download_name=orig_fname)
    except Exception as e:
        app.logger.error(f"API: Error serving file {dpath}: {e}", exc_info=True)
        abort(500, description="Error preparing file for display.")

@app.route(f'{API_PREFIX}/media/<uuid:media_id>/download', methods=['GET', 'OPTIONS'])
@login_required_api
@owner_or_admin_access_required_api(item_type='media')
def api_download_media_item(media_id, media_data):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: abort(503, description="DB unavailable.")

    rpath = media_data.get('filepath'); orig_fname = media_data.get('original_filename', f"download_{media_id}.bin")
    mime = media_data.get('mimetype', 'application/octet-stream')
    
    if not rpath:
        app.logger.error(f"API: Download item {media_id} failed: No filepath in Redis.")
        abort(404, description="File information missing.")

    dpath = os.path.join(app.config['UPLOAD_FOLDER'], rpath)
    if not os.path.isfile(dpath):
        app.logger.error(f"API: Download item {media_id} (path: {dpath}) failed: File not found on disk.")
        abort(404, description="File not found on server.")
    
    app.logger.info(f"API: User '{session['username']}' downloading '{orig_fname}' (ID: {media_id})")
    try:
        # as_attachment=True means the browser will force a download
        return send_file(dpath, mimetype=mime, as_attachment=True, download_name=orig_fname)
    except Exception as e:
        app.logger.error(f"API: Error serving file {dpath}: {e}", exc_info=True)
        abort(500, description="Error preparing file for download.")

@app.route(f'{API_PREFIX}/batches/<uuid:batch_id>/export', methods=['GET', 'OPTIONS'])
@login_required_api
@owner_or_admin_access_required_api(item_type='batch')
def api_export_batch(batch_id, batch_data):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: abort(503, description="DB unavailable.")
    batch_id_str = str(batch_id); safe_name = secure_filename(batch_data.get('name',f'batch_{batch_id_str[:8]}')).replace(' ','_')
    
    manifest = {
        "lightbox_name": batch_data.get('name','Untitled'),
        "export_version": "1.1",
        "export_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "batch_id_exported_from": batch_id_str,
        "files": []
    }
    zip_fnames_used = set(); memory_zip = BytesIO(); files_in_zip = 0
    try:
        with zipfile.ZipFile(memory_zip,'w',zipfile.ZIP_DEFLATED) as zf:
            media_ids = redis_client.lrange(f'batch:{batch_id_str}:media_ids',0,-1)
            if not media_ids: # Handle empty batch for export
                # For an API, return JSON error rather than redirect/flash
                return jsonify(success=False, message="Lightbox is empty or contains no exportable items."), 404
            
            for idx, mid in enumerate(media_ids):
                minfo = redis_client.hgetall(f'media:{mid}')
                # Only export completed, non-hidden media or blobs (not import archives themselves)
                if minfo and minfo.get('is_hidden','0')=='0' and minfo.get('processing_status','completed')=='completed' and minfo.get('item_type') != 'archive_import':
                    rpath = minfo.get('filepath'); orig_fname = minfo.get('original_filename',f"item_{mid}"); item_type = minfo.get('item_type','media'); desc = minfo.get('description','')
                    if rpath:
                        dpath = os.path.join(app.config['UPLOAD_FOLDER'], rpath)
                        if os.path.isfile(dpath):
                            base, ext = os.path.splitext(orig_fname); arc_base = secure_filename(base if base else f"item_{idx}"); arc_cand = f"{arc_base}{ext if ext else '.bin'}"
                            ct = 0; final_arc = arc_cand
                            while final_arc in zip_fnames_used: ct+=1; final_arc = f"{arc_base}_{ct}{ext if ext else '.bin'}"
                            zip_fnames_used.add(final_arc); zf.write(dpath, arcname=final_arc)
                            manifest['files'].append({"zip_path":final_arc, "original_filename":orig_fname, "item_type":item_type, "mimetype":minfo.get('mimetype','application/octet-stream'), "description":desc, "is_hidden":minfo.get('is_hidden','0')=='1'})
                            files_in_zip +=1
                        else: app.logger.warning(f"API Export: File missing {dpath}")
                    else: app.logger.warning(f"API Export: Filepath missing for {mid}")
            
            if files_in_zip == 0:
                return jsonify(success=False, message="No exportable files found in this Lightbox."), 404
            
            zf.writestr('lightbox_manifest.json', json.dumps(manifest, indent=2))
        
        memory_zip.seek(0); zip_fname = f"LightBox_{safe_name}_Export_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        app.logger.info(f"API: User '{session['username']}' exporting {files_in_zip} items from batch '{batch_id_str}'.")
        
        # This route still returns a file directly, not JSON.
        return send_file(memory_zip, mimetype='application/zip', as_attachment=True, download_name=zip_fname)
    
    except redis.exceptions.RedisError as e: app.logger.error(f"API: Redis error export batch {batch_id_str}: {e}"); abort(500, description="Database error during export.")
    except Exception as e: app.logger.error(f"API: Error export batch {batch_id_str}: {e}", exc_info=True); abort(500, description="An unexpected server error occurred during export.")


# --- Public Access Endpoints (for shared Lightboxes) ---

@app.route(f'{API_PREFIX}/public/batches/<string:share_token>', methods=['GET', 'OPTIONS'])
def api_public_batch_view(share_token):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: return jsonify(success=False, message="DB unavailable."), 503

    try:
        batch_id_str = redis_client.get(f'share_token:{share_token}')
        if not batch_id_str:
            app.logger.warning(f"API: Public view: Invalid share token: {share_token}")
            return jsonify(success=False, message="Link invalid or expired."), 404
        
        batch_info = redis_client.hgetall(f'batch:{batch_id_str}')
        if not batch_info or batch_info.get('is_shared', '0') != '1':
            app.logger.warning(f"API: Public view: Access attempt to non-shared batch {batch_id_str}")
            return jsonify(success=False, message="Lightbox is not publicly shared."), 403
        
        batch_info['id'] = batch_id_str
        batch_info['is_shared'] = batch_info.get('is_shared', '0') == '1' # Convert to boolean
        if 'creation_timestamp' in batch_info:
            batch_info['creation_timestamp'] = float(batch_info['creation_timestamp'])
        if 'last_modified_timestamp' in batch_info:
            batch_info['last_modified_timestamp'] = float(batch_info['last_modified_timestamp'])

        media_ids = redis_client.lrange(f'batch:{batch_id_str}:media_ids', 0, -1)
        media_list = []; valid_items = 0
        
        for mid in media_ids:
            mdata = redis_client.hgetall(f'media:{mid}')
            # Only include completed, non-hidden media items or blobs that are available
            if mdata and mdata.get('is_hidden','0')=='0' and mdata.get('processing_status','completed')=='completed' and mdata.get('item_type') in ['media', 'blob']:
                mdata['id'] = mid
                mdata['item_type'] = mdata.get('item_type','media')
                mdata['is_hidden'] = mdata.get('is_hidden','0') == '1' # Convert to boolean
                mdata['is_liked'] = mdata.get('is_liked','0') == '1' # Convert to boolean
                if 'upload_timestamp' in mdata:
                    mdata['upload_timestamp'] = float(mdata['upload_timestamp'])
                mdata['description'] = mdata.get('description', '')

                rpath = mdata.get('filepath')
                if rpath:
                    # Provide public display URL for images/videos/audio
                    mdata['public_display_url'] = url_for('api_public_display_media_item', share_token=share_token, media_id=mid, _external=True)
                    # Provide public download URL for all publicly accessible items (media and blobs)
                    mdata['public_download_url'] = url_for('api_public_download_media_item', share_token=share_token, media_id=mid, _external=True)
                    
                    media_list.append(mdata)
                    valid_items += 1
                else:
                    app.logger.warning(f"API: Public view: Completed item {mid} missing filepath.")
        
        batch_info['item_count'] = valid_items # Count of items returned in this list
        
        return jsonify(
            success=True,
            batch=batch_info,
            media_items=media_list
        ), 200

    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error public_batch_view {share_token}: {e}", exc_info=True)
        return jsonify(success=False, message="Database error during public view."), 500
    except Exception as e:
        app.logger.error(f"API: Unexpected error public_batch_view {share_token}: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred during public view."), 500

@app.route(f'{API_PREFIX}/public/slideshow/<string:share_token>', methods=['GET', 'OPTIONS'])
def api_public_slideshow_view(share_token):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: return jsonify(success=False, message="DB unavailable."), 503

    try:
        batch_id_str = redis_client.get(f'share_token:{share_token}')
        if not batch_id_str:
            return jsonify(success=False, message="Invalid or expired share link."), 404
        
        batch_info = redis_client.hgetall(f'batch:{batch_id_str}')
        if not batch_info or batch_info.get('is_shared', '0') != '1':
            return jsonify(success=False, message="Lightbox is not publicly shared."), 403
        
        batch_info['id'] = batch_id_str
        batch_info['is_shared'] = batch_info.get('is_shared', '0') == '1' # Convert to boolean
        if 'creation_timestamp' in batch_info:
            batch_info['creation_timestamp'] = float(batch_info['creation_timestamp'])
        if 'last_modified_timestamp' in batch_info:
            batch_info['last_modified_timestamp'] = float(batch_info['last_modified_timestamp'])

        media_ids = redis_client.lrange(f'batch:{batch_id_str}:media_ids', 0, -1)
        js_media_list = [] # Media specifically for slideshow, simplified data
        
        for mid in media_ids:
            mdata = redis_client.hgetall(f'media:{mid}')
            # Only include media/blob items that are not hidden, are completed, and are displayable (image/video/audio)
            if mdata and mdata.get('is_hidden','0')=='0' and mdata.get('processing_status','completed')=='completed' and mdata.get('item_type') in ['media', 'blob']:
                rpath = mdata.get('filepath')
                mimetype = mdata.get('mimetype')
                if rpath and mimetype and mimetype.startswith(('image/','video/','audio/')):
                    js_media_list.append({
                        'id': mid,
                        'public_display_url': url_for('api_public_display_media_item', share_token=share_token, media_id=mid, _external=True),
                        'mimetype': mimetype,
                        'original_filename': mdata.get('original_filename','unknown'),
                        'description': mdata.get('description', '')
                    })
        
        if not js_media_list:
            return jsonify(success=False, message="No playable media items available for slideshow in this Lightbox."), 404 # Not Found
        
        return jsonify(
            success=True,
            batch=batch_info,
            media_data=js_media_list,
            is_public_view=True # To inform the frontend
        ), 200

    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error public_slideshow {share_token}: {e}", exc_info=True)
        return jsonify(success=False, message="Database error during public slideshow view."), 500
    except Exception as e:
        app.logger.error(f"API: Unexpected error public_slideshow {share_token}: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred during public slideshow view."), 500

@app.route(f'{API_PREFIX}/public/media/<string:share_token>/<uuid:media_id>/display', methods=['GET', 'OPTIONS'])
def api_public_display_media_item(share_token, media_id):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: abort(503, description="DB unavailable.")

    try:
        batch_id_str = redis_client.get(f'share_token:{share_token}')
        if not batch_id_str:
            app.logger.warning(f"API: Public display: Invalid share token: {share_token}")
            abort(404, description="Invalid or expired share link.")
        
        b_info = redis_client.hgetall(f'batch:{batch_id_str}')
        if not b_info or b_info.get('is_shared','0')!='1':
            app.logger.warning(f"API: Public display: Access attempt to non-shared batch {batch_id_str} via token {share_token}")
            abort(403, description="Lightbox is not publicly shared.")
        
        mdata = redis_client.hgetall(f'media:{media_id}')
        # Ensure media belongs to the batch, is not hidden, completed, and is a displayable type
        if not mdata or mdata.get('batch_id')!=batch_id_str or mdata.get('is_hidden','0')=='1' or mdata.get('processing_status')!='completed' or mdata.get('item_type') not in ['media', 'blob']: # Allow blobs for direct display
            app.logger.warning(f"API: Public display: Item {media_id} conditions not met (e.g., not found, hidden, not completed, not media/blob).")
            abort(404, description="File not found or not available for public display.")
        
        rpath = mdata.get('filepath'); orig_fname = mdata.get('original_filename',f"display_{media_id}.bin")
        mime = mdata.get('mimetype','application/octet-stream')
        
        if not rpath:
            app.logger.error(f"API: Public display item {media_id} failed: No filepath.")
            abort(404, description="File information missing for public display.")
        
        dpath = os.path.join(app.config['UPLOAD_FOLDER'], rpath)
        if not os.path.isfile(dpath):
            app.logger.error(f"API: Public display item {media_id} (path: {dpath}) failed: File not found on server.")
            abort(404, description="File not found on server for public display.")
        
        app.logger.info(f"API: Public display for '{orig_fname}' (ID: {media_id}) via token {share_token}.")
        return send_file(dpath, mimetype=mime, as_attachment=False, download_name=orig_fname) # as_attachment=False for display

    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error public_display {share_token} media {media_id}: {e}", exc_info=True)
        abort(500, description="Database error during public display.")
    except Exception as e:
        app.logger.error(f"API: Unexpected error public_display {share_token} media {media_id}: {e}", exc_info=True)
        abort(500, description="An unexpected server error occurred during public display.")

@app.route(f'{API_PREFIX}/public/media/<string:share_token>/<uuid:media_id>/download', methods=['GET', 'OPTIONS'])
def api_public_download_media_item(share_token, media_id):
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: abort(503, description="DB unavailable.")

    try:
        batch_id_str = redis_client.get(f'share_token:{share_token}')
        if not batch_id_str:
            app.logger.warning(f"API: Public download: Invalid share token: {share_token}")
            abort(404, description="Invalid or expired share link.")
        
        b_info = redis_client.hgetall(f'batch:{batch_id_str}')
        if not b_info or b_info.get('is_shared','0')!='1':
            app.logger.warning(f"API: Public download: Access attempt to non-shared batch {batch_id_str} via token {share_token}")
            abort(403, description="Lightbox is not publicly shared.")
        
        mdata = redis_client.hgetall(f'media:{media_id}')
        # Ensure media belongs to the batch, is not hidden, completed, and is a media/blob type
        if not mdata or mdata.get('batch_id')!=batch_id_str or mdata.get('is_hidden','0')=='1' or mdata.get('processing_status')!='completed' or mdata.get('item_type') not in ['media','blob']:
            app.logger.warning(f"API: Public download: Item {media_id} conditions not met (e.g., not found, hidden, not completed, not media/blob).")
            abort(404, description="File not found or not available for public download.")
        
        rpath = mdata.get('filepath'); orig_fname = mdata.get('original_filename',f"download_{media_id}.bin")
        mime = mdata.get('mimetype','application/octet-stream')
        
        if not rpath:
            app.logger.error(f"API: Public download item {media_id} failed: No filepath.")
            abort(404, description="File information missing for public download.")
        
        dpath = os.path.join(app.config['UPLOAD_FOLDER'], rpath)
        if not os.path.isfile(dpath):
            app.logger.error(f"API: Public download item {media_id} (path: {dpath}) failed: File not found on server.")
            abort(404, description="File not found on server for public download.")
        
        app.logger.info(f"API: Public download for '{orig_fname}' (ID: {media_id}) via token {share_token}.")
        return send_file(dpath, mimetype=mime, as_attachment=True, download_name=orig_fname)

    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error public_download {share_token} media {media_id}: {e}", exc_info=True)
        abort(500, description="Database error during public download.")
    except Exception as e:
        app.logger.error(f"API: Unexpected error public_download {share_token} media {media_id}: {e}", exc_info=True)
        abort(500, description="An unexpected server error occurred during public download.")


# --- Admin Dashboard Endpoints ---
@app.route(f'{API_PREFIX}/admin/users', methods=['GET', 'OPTIONS'])
@login_required_api
@admin_required_api
def api_admin_dashboard():
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: return jsonify(success=False, message="DB unavailable."), 503
    
    try:
        usernames = redis_client.smembers('users')
        users_data = []
        for uname in sorted(list(usernames),key=lambda s:s.lower()):
            uinfo = redis_client.hgetall(f'user:{uname}')
            uinfo['username'] = uname
            uinfo['is_admin'] = uinfo.get('is_admin', '0') == '1' # Convert to boolean
            uinfo['batch_count'] = redis_client.llen(f'user:{uname}:batches')
            users_data.append(uinfo)
        
        return jsonify(success=True, users=users_data), 200
    
    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error admin_dashboard: {e}", exc_info=True)
        return jsonify(success=False, message="Error loading admin data from database."), 500
    except Exception as e:
        app.logger.error(f"API: Unexpected error admin_dashboard: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred."), 500

@app.route(f'{API_PREFIX}/admin/users/change_password', methods=['POST', 'OPTIONS'])
@login_required_api
@admin_required_api
def api_change_user_password():
    if request.method == 'OPTIONS': return '', 204 # Handled by CORS
    if not redis_client: return jsonify(success=False, message="DB unavailable."), 503

    data = request.get_json()
    if not data: return jsonify(success=False, message="Username and new password required."), 400

    target_user = data.get('username')
    new_pass = data.get('new_password')
    
    if not target_user or not new_pass:
        return jsonify(success=False, message="Username and new password are required."), 400
    
    if len(new_pass) < 8:
        return jsonify(success=False, message="Password too short (minimum 8 characters)."), 400
    
    try:
        if not redis_client.sismember('users', target_user):
            return jsonify(success=False, message=f'User "{target_user}" not found.'), 404
        
        redis_client.hset(f'user:{target_user}','password_hash',generate_password_hash(new_pass))
        
        app.logger.info(f"API: Admin '{session['username']}' changed password for '{target_user}'.")
        return jsonify(success=True, message=f'Password updated for user "{target_user}".', username=target_user), 200
    
    except redis.exceptions.RedisError as e:
        app.logger.error(f"API: Redis error changing password for {target_user}: {e}", exc_info=True)
        return jsonify(success=False, message="Database error changing password."), 500
    except Exception as e:
        app.logger.error(f"API: Unexpected error changing password for {target_user}: {e}", exc_info=True)
        return jsonify(success=False, message="An unexpected server error occurred."), 500

# --- Consolidated JSON Error Handlers (for all API endpoints) ---
@app.errorhandler(400)
def bad_request_error(e):
    desc = getattr(e,'description',"Bad request.")
    app.logger.warning(f"API 400 {request.url}: {desc}", exc_info=e if app.debug else False)
    return jsonify(error="Bad Request",message=desc),400
@app.errorhandler(401)
def unauthorized_error(e):
    desc = getattr(e,'description',"Unauthorized.")
    app.logger.info(f"API 401 {request.url}: {desc}")
    return jsonify(error="Unauthorized",message=desc),401
@app.errorhandler(403)
def forbidden_error(e):
    desc = getattr(e,'description',"Forbidden.")
    app.logger.warning(f"API 403 {request.url}: {desc}", exc_info=e if app.debug else False)
    return jsonify(error="Forbidden",message=desc),403
@app.errorhandler(404)
def page_not_found_error(e):
    desc = getattr(e,'description',"Resource not found.")
    app.logger.warning(f"API 404 {request.url}: {desc}", exc_info=e if app.debug else False)
    return jsonify(error="Not Found",message=desc),404
@app.errorhandler(413)
def request_entity_too_large_error(e):
    max_bytes = app.config.get('MAX_CONTENT_LENGTH',0)
    max_read = "limit"
    if max_bytes > 0:
        gb,mb,kb = 1024**3,1024**2,1024
        if max_bytes>=gb: max_read=f"{max_bytes/gb:.1f} GB"
        elif max_bytes>=mb: max_read=f"{max_bytes/mb:.0f} MB"
        else: max_read=f"{max_bytes/kb:.0f} KB"
    msg = f"Upload failed: File(s) too large. Max allowed: {max_read}."
    app.logger.warning(f"API 413 {request.url}. {msg}")
    return jsonify(error="Payload Too Large",message=msg,limit=max_read),413
@app.errorhandler(429)
def too_many_requests_error(e):
    desc = getattr(e,'description',"Too many requests.")
    app.logger.warning(f"API 429 {request.url}: {desc}", exc_info=e if app.debug else False)
    headers=getattr(e,'headers',{})
    return jsonify(error="Too Many Requests",message=desc),429,headers
@app.errorhandler(500)
def internal_server_error(e):
    orig_exc = str(getattr(e,'original_exception',e))
    app.logger.error(f"API 500 {request.url}: {orig_exc}", exc_info=True)
    return jsonify(error="Internal Server Error",message="An unexpected server error occurred."),500
@app.errorhandler(503)
def service_unavailable_error(e):
    desc = getattr(e,'description',"Service unavailable.")
    app.logger.error(f"API 503 {request.url}: {desc}", exc_info=True if app.debug else False)
    headers=getattr(e,'headers',{})
    return jsonify(error="Service Unavailable",message=desc),503,headers


if __name__ == '__main__':
    print("--- Starting Flask API App (local dev/test) ---")
    upload_dir = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_dir):
        try: os.makedirs(upload_dir); print(f"Created UPLOAD_FOLDER: {upload_dir}")
        except OSError as e: print(f"ERROR creating UPLOAD_FOLDER {upload_dir}: {e}")
    # Also ensure the temporary zip extract directory exists
    temp_zip_extracts_dir = os.path.join(app.config['UPLOAD_FOLDER'], "temp_zip_extracts")
    if not os.path.exists(temp_zip_extracts_dir):
        try: os.makedirs(temp_zip_extracts_dir); print(f"Created temp_zip_extracts dir: {temp_zip_extracts_dir}")
        except OSError as e: print(f"ERROR creating temp_zip_extracts dir {temp_zip_extracts_dir}: {e}")

    app.logger.info(f"App '{app.name}' mode (debug={app.debug}).")
    app.logger.info(f"FFMPEG_PATH used by app: {app.config.get('FFMPEG_PATH')}")
    app.logger.info(f"APP_REDIS_DB_NUM for app data: {app.config.get('APP_REDIS_DB_NUM')}")
    app.logger.info(f"Celery Broker URL: {app.config.get('broker_url')}")
    app.logger.info(f"Celery Result Backend URL: {app.config.get('result_backend')}")
    app.logger.info(f"Video to MP4 Config: Formats='{app.config.get('VIDEO_FORMATS_TO_CONVERT_TO_MP4')}'")
    app.logger.info(f"Audio to MP3 Config: Formats='{app.config.get('AUDIO_FORMATS_TO_CONVERT_TO_MP3')}'")
    
    host = os.environ.get('FLASK_RUN_HOST','0.0.0.0'); port = int(os.environ.get('FLASK_RUN_PORT',5005))
    app.run(debug=app.debug, host=host, port=port)

