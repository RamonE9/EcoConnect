import os
import uuid
import logging
import requests
from django.conf import settings
from django.core.files.storage import FileSystemStorage

logger = logging.getLogger(__name__)

def upload_image_file(file, folder_prefix="photos", filename_prefix=""):
    """
    Uploads an image file to Supabase Storage if configured.
    Falls back to local FileSystemStorage in static/uploads/ if credentials are missing
    or if upload fails.
    
    Returns the public URL (if Supabase) or relative path (e.g. 'static/uploads/filename').
    """
    if not file:
        return None

    supabase_url = getattr(settings, 'SUPABASE_URL', '').rstrip('/')
    supabase_key = getattr(settings, 'SUPABASE_KEY', '')
    bucket = getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'photos')

    orig_name = getattr(file, 'name', 'image.jpg')
    ext = os.path.splitext(orig_name)[1].lower() or '.jpg'
    safe_prefix = "".join(c for c in filename_prefix if c.isalnum() or c in ('-', '_')).strip('-_')
    uid = uuid.uuid4().hex[:8]
    safe_name = f"{safe_prefix}_{uid}{ext}" if safe_prefix else f"{uid}{ext}"
    storage_path = f"{folder_prefix}/{safe_name}".lstrip('/')

    # Attempt Supabase Storage upload
    if supabase_url and supabase_key:
        try:
            upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{storage_path}"
            content_type = getattr(file, 'content_type', 'image/jpeg') or 'image/jpeg'

            if hasattr(file, 'seek'):
                file.seek(0)
            file_bytes = file.read()

            headers = {
                'Authorization': f'Bearer {supabase_key}',
                'apikey': supabase_key,
                'Content-Type': content_type,
                'x-upsert': 'true',
            }
            resp = requests.post(upload_url, data=file_bytes, headers=headers, timeout=12)
            if resp.status_code in (200, 201):
                public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{storage_path}"
                logger.info("Successfully uploaded image to Supabase Storage: %s", public_url)
                return public_url
            else:
                logger.warning(
                    "Supabase storage upload returned status %d: %s. Falling back to local storage.",
                    resp.status_code, resp.text
                )
        except Exception as e:
            logger.exception("Error uploading to Supabase Storage: %s. Falling back to local storage.", e)

    # Fallback to local storage (static/uploads/)
    try:
        if hasattr(file, 'seek'):
            file.seek(0)
        upload_dir = os.path.join(settings.BASE_DIR, 'static', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        fs = FileSystemStorage(location=upload_dir)
        saved_filename = fs.save(safe_name, file)
        return f"static/uploads/{saved_filename}"
    except Exception as e:
        logger.exception("Error saving file locally: %s", e)
        return None
