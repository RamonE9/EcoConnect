import os
import uuid
import logging
import requests
from urllib.parse import quote
from django.conf import settings
from django.core.files.storage import FileSystemStorage

from .validators import ValidationError

logger = logging.getLogger(__name__)

# File signatures ("magic bytes") of the image formats we accept. Checking the
# bytes themselves means a renamed .exe or .html file is rejected even if the
# browser claims it is image/jpeg.
IMAGE_SIGNATURES = {
    '.jpg': (b'\xff\xd8\xff',),
    '.png': (b'\x89PNG\r\n\x1a\n',),
    '.gif': (b'GIF87a', b'GIF89a'),
    '.webp': (b'RIFF',),
}
CONTENT_TYPES = {'.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'}


def validate_image_upload(file):
    """Return the safe extension for an uploaded image or raise ValidationError."""
    max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 5 * 1024 * 1024)
    if file.size == 0:
        raise ValidationError('The uploaded file is empty.')
    if file.size > max_size:
        raise ValidationError(f'Image must be {max_size // (1024 * 1024)} MB or smaller.')

    file.seek(0)
    head = file.read(16)
    file.seek(0)
    for ext, signatures in IMAGE_SIGNATURES.items():
        if any(head.startswith(sig) for sig in signatures):
            if ext == '.webp' and head[8:12] != b'WEBP':
                continue
            return ext
    raise ValidationError('Only JPG, PNG, GIF or WEBP images are allowed.')


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

    # Callers validate first; this re-check keeps the helper safe on its own.
    ext = validate_image_upload(file)
    safe_prefix = "".join(c for c in filename_prefix if c.isalnum() or c in ('-', '_')).strip('-_')
    uid = uuid.uuid4().hex[:8]
    safe_name = f"{safe_prefix}_{uid}{ext}" if safe_prefix else f"{uid}{ext}"
    storage_path = f"{folder_prefix}/{safe_name}".lstrip('/')

    # Attempt Supabase Storage upload
    if supabase_url and supabase_key:
        try:
            # Bucket names may contain spaces, so encode them for the URL.
            bucket_path = quote(bucket, safe='')
            upload_url = f"{supabase_url}/storage/v1/object/{bucket_path}/{storage_path}"
            content_type = CONTENT_TYPES[ext]

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
                public_url = f"{supabase_url}/storage/v1/object/public/{bucket_path}/{storage_path}"
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
