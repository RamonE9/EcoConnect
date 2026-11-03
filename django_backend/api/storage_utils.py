import os
import uuid
import logging
import requests
from urllib.parse import quote
from django.conf import settings
from django.core import signing
from django.core.files.storage import FileSystemStorage

from .validators import ValidationError

logger = logging.getLogger(__name__)

IMAGE_SIGNATURES = {
    '.jpg': (b'\xff\xd8\xff',),
    '.png': (b'\x89PNG\r\n\x1a\n',),
    '.gif': (b'GIF87a', b'GIF89a'),
    '.webp': (b'RIFF',),
}
CONTENT_TYPES = {'.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'}


def validate_image_upload(file):
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


PRIVATE_PREFIX = 'private:'


def _supabase_config():
    return getattr(settings, 'SUPABASE_URL', '').rstrip('/'), getattr(settings, 'SUPABASE_KEY', '')


def _supabase_headers(key, **extra):
    return {'Authorization': f'Bearer {key}', 'apikey': key, **extra}


def upload_image_file(file, folder_prefix="photos", filename_prefix="", private=False):
    if not file:
        return None

    supabase_url, supabase_key = _supabase_config()
    bucket = getattr(settings, 'SUPABASE_ID_BUCKET' if private else 'SUPABASE_STORAGE_BUCKET', 'photos')

    ext = validate_image_upload(file)
    safe_prefix = "".join(c for c in filename_prefix if c.isalnum() or c in ('-', '_')).strip('-_')
    uid = uuid.uuid4().hex[:12]
    safe_name = f"{safe_prefix}_{uid}{ext}" if safe_prefix else f"{uid}{ext}"
    storage_path = f"{folder_prefix}/{safe_name}".lstrip('/')

    if supabase_url and supabase_key:
        try:
            bucket_path = quote(bucket, safe='')
            file.seek(0)
            resp = requests.post(
                f"{supabase_url}/storage/v1/object/{bucket_path}/{storage_path}",
                data=file.read(),
                headers=_supabase_headers(supabase_key, **{'Content-Type': CONTENT_TYPES[ext], 'x-upsert': 'true'}),
                timeout=12,
            )
            if resp.status_code in (200, 201):
                if private:
                    return f"{PRIVATE_PREFIX}supabase:{bucket}/{storage_path}"
                return f"{supabase_url}/storage/v1/object/public/{bucket_path}/{storage_path}"
            logger.warning("Supabase upload returned %d: %s. Falling back to local storage.", resp.status_code, resp.text[:200])
        except Exception as exc:
            logger.exception("Error uploading to Supabase Storage: %s. Falling back to local storage.", exc)

    try:
        file.seek(0)
        if private:
            fs = FileSystemStorage(location=settings.PRIVATE_UPLOAD_DIR)
            return f"{PRIVATE_PREFIX}local:{fs.save(safe_name, file)}"
        upload_dir = os.path.join(settings.BASE_DIR, 'static', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        return f"static/uploads/{FileSystemStorage(location=upload_dir).save(safe_name, file)}"
    except Exception as exc:
        logger.exception("Error saving file locally: %s", exc)
        return None


def private_image_url(reference, request=None):
    if not reference:
        return None
    if not reference.startswith(PRIVATE_PREFIX):
        return reference if reference.startswith('http') else f"/{reference.lstrip('/')}"

    kind, _, location = reference[len(PRIVATE_PREFIX):].partition(':')
    seconds = settings.ID_LINK_SECONDS

    if kind == 'supabase':
        supabase_url, supabase_key = _supabase_config()
        bucket, _, path = location.partition('/')
        try:
            resp = requests.post(
                f"{supabase_url}/storage/v1/object/sign/{quote(bucket, safe='')}/{path}",
                json={'expiresIn': seconds},
                headers=_supabase_headers(supabase_key),
                timeout=10,
            )
            if resp.ok:
                return f"{supabase_url}/storage/v1{resp.json()['signedURL']}"
            logger.warning("Could not sign private image (%d): %s", resp.status_code, resp.text[:200])
        except Exception as exc:
            logger.exception("Error signing private image: %s", exc)
        return None

    if kind == 'local':
        token = signing.dumps(os.path.basename(location), salt='private-id-image')
        return f"/api/media/private/{token}"
    return None


def open_local_private_image(token):
    try:
        name = signing.loads(token, salt='private-id-image', max_age=settings.ID_LINK_SECONDS)
    except signing.BadSignature:
        return None
    path = os.path.join(settings.PRIVATE_UPLOAD_DIR, os.path.basename(name))
    if not os.path.isfile(path):
        return None
    return path, CONTENT_TYPES.get(os.path.splitext(path)[1].lower(), 'application/octet-stream')


def delete_private_image(reference):
    if not reference or not reference.startswith(PRIVATE_PREFIX):
        return
    kind, _, location = reference[len(PRIVATE_PREFIX):].partition(':')
    try:
        if kind == 'supabase':
            supabase_url, supabase_key = _supabase_config()
            bucket, _, path = location.partition('/')
            requests.delete(f"{supabase_url}/storage/v1/object/{quote(bucket, safe='')}/{path}",
                            headers=_supabase_headers(supabase_key), timeout=10)
        elif kind == 'local':
            path = os.path.join(settings.PRIVATE_UPLOAD_DIR, os.path.basename(location))
            if os.path.isfile(path):
                os.remove(path)
    except Exception as exc:
        logger.warning("Could not delete old private image: %s", exc)
