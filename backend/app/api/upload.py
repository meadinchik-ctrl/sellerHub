import io
import os
import uuid
from PIL import Image, ImageOps
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from backend.app.core.config import settings
from backend.app.core.dependencies import get_current_user
from backend.app.models.models import User

router = APIRouter(prefix="/upload", tags=["File Upload"])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "heic", "avif"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB исходного файла
MAX_IMAGE_DIMENSION = 1920  # максимальная ширина/высота в пикселях
WEBP_QUALITY = 82  # отличное качество при высоком сжатии


def compress_and_save_image(raw_bytes: bytes, original_ext: str) -> tuple[str, int]:
    """
    Сжимает и оптимизирует изображение:
    - Исправляет ориентацию EXIF (с телефонов)
    - Пропорционально уменьшает размер, если он больше 1920px
    - Конвертирует в современный WebP с качеством 82% (экономия до 70-85% веса)
    - Для SVG сохраняет оригинал без изменений
    """
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    
    if original_ext == "svg":
        filename = f"img_{uuid.uuid4().hex[:16]}.svg"
        dest_path = os.path.join(settings.STORAGE_DIR, filename)
        with open(dest_path, "wb") as f:
            f.write(raw_bytes)
        return filename, len(raw_bytes)

    try:
        image = Image.open(io.BytesIO(raw_bytes))
        
        # Исправляем переворот фото с iPhone/Android (EXIF orientation)
        image = ImageOps.exif_transpose(image)
        
        # Если есть альфа-канал, сохраняем RGBA, иначе RGB
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")
            
        # Пропорциональное уменьшение максимального разрешения
        orig_w, orig_h = image.size
        if orig_w > MAX_IMAGE_DIMENSION or orig_h > MAX_IMAGE_DIMENSION:
            image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)
            
        filename = f"img_{uuid.uuid4().hex[:16]}.webp"
        dest_path = os.path.join(settings.STORAGE_DIR, filename)
        
        # Сохранение в WebP с оптимизацией
        image.save(dest_path, format="WEBP", quality=WEBP_QUALITY, method=6)
        file_size = os.path.getsize(dest_path)
        return filename, file_size
    except Exception as e:
        # Fallback: если Pillow не смог распарсить специфичный формат
        ext = original_ext if original_ext in {"jpg", "jpeg", "png", "webp"} else "jpg"
        filename = f"img_{uuid.uuid4().hex[:16]}.{ext}"
        dest_path = os.path.join(settings.STORAGE_DIR, filename)
        with open(dest_path, "wb") as f:
            f.write(raw_bytes)
        return filename, len(raw_bytes)


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый формат файла. Разрешены: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Размер файла превышает 25 МБ")

    filename, compressed_size = compress_and_save_image(content, ext)

    file_url = f"/uploads/{filename}"
    return {
        "url": file_url,
        "filename": filename,
        "size": compressed_size,
        "original_size": len(content),
        "compression_ratio": round((1 - (compressed_size / max(len(content), 1))) * 100, 1)
    }
