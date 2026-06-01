import qrcode
import os
from app.core.config import settings

async def generate_qr_code(event_id: int, event_title: str) -> str:
    os.makedirs("media/qr", exist_ok=True)

    url = f"{settings.FRONTEND_URL}/events/{event_id}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    filename = f"event_{event_id}.png"
    path = f"media/qr/{filename}"
    img.save(path)

    return f"/media/qr/{filename}"