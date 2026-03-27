"""
Passport scanner using OpenCV preprocessing + PassportEye (MRZ) + Tesseract OCR.

Pipeline:
  MRZ strategies (tries in order, returns first success):
    1. PassportEye on ORIGINAL image        (best — PassportEye prefers color)
    2. PassportEye on rotations of original (0/90/180/270°)
    3. PassportEye on grayscale (no binary) of original
    4. PassportEye on MRZ crop of original  (bottom 40%)
    5. PassportEye on binary-preprocessed image
    6. Tesseract OCR on grayscale image     (fallback)
    7. Tesseract OCR on binary image        (last resort)

  VIZ reading (always runs, supplements MRZ with fields not in MRZ):
    - Tesseract OCR on top 75% of image (Visual Inspection Zone)
    - Extracts: dateOfIssue, placeOfBirth, personalNo (National ID)
"""
import re
import os
import tempfile
from datetime import date
from typing import Optional

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("Warning: opencv-python not installed. Image preprocessing unavailable.")

try:
    from passporteye import read_mrz
    PASSPORTEYE_AVAILABLE = True
except ImportError:
    PASSPORTEYE_AVAILABLE = False
    print("Warning: passporteye not installed. MRZ scanning unavailable.")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: pytesseract or PIL not installed. OCR unavailable.")


# ── Helpers ───────────────────────────────────────────────────────────────────

_VIZ_MONTHS = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4,  'MAY': 5,  'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
}


def parse_mrz_date(date_str: str) -> Optional[str]:
    """Parse MRZ date YYMMDD → ISO YYYY-MM-DD."""
    if not date_str or len(date_str) != 6:
        return None
    try:
        yy = int(date_str[:2])
        mm = int(date_str[2:4])
        dd = int(date_str[4:6])
        if mm < 1 or mm > 12 or dd < 1 or dd > 31:
            return None
        current_year = date.today().year % 100
        century = 2000 if yy <= current_year + 10 else 1900
        return f"{century + yy:04d}-{mm:02d}-{dd:02d}"
    except ValueError:
        return None


def _parse_viz_date(date_str: str) -> Optional[str]:
    """Parse VIZ date formats: 'DD MMM YYYY' or 'DD/MM/YYYY' → ISO YYYY-MM-DD."""
    if not date_str:
        return None
    s = date_str.strip().upper()
    # DD MMM YYYY
    m = re.match(r'(\d{1,2})\s+([A-Z]{3})\s+(\d{4})', s)
    if m:
        dd = int(m.group(1))
        mon = _VIZ_MONTHS.get(m.group(2))
        yyyy = int(m.group(3))
        if mon and 1 <= dd <= 31:
            return f"{yyyy:04d}-{mon:02d}-{dd:02d}"
    # DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    m = re.match(r'(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})', s)
    if m:
        dd, mm, yyyy = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mm <= 12 and 1 <= dd <= 31:
            return f"{yyyy:04d}-{mm:02d}-{dd:02d}"
    return None


def clean_name(name_str: str) -> str:
    """Convert MRZ name format LAST<<FIRST<MIDDLE → readable."""
    return name_str.replace('<', ' ').strip()


def _extract_result_from_mrz(mrz, method: str) -> dict:
    """Convert a PassportEye MRZ result object to our result dict."""
    d    = mrz.to_dict()
    raw  = d.get('raw_text', '') or ''
    lines = raw.split('\n')
    return {
        'passportNumber': (d.get('number', '') or '').replace('<', '').strip() or None,
        'lastName':       clean_name(d.get('surname', '') or ''),
        'firstName':      clean_name(d.get('names', '') or ''),
        'nationality':    (d.get('nationality', '') or '').replace('<', '').strip() or None,
        'issuingCountry': (d.get('country', '') or '').replace('<', '').strip() or None,
        'sex':            (d.get('sex', '') or '').replace('<', '').strip() or None,
        'dateOfBirth':    parse_mrz_date(d.get('date_of_birth', '') or ''),
        'expiryDate':     parse_mrz_date(d.get('expiration_date', '') or ''),
        'mrzLine1':       lines[0] if len(lines) > 0 else None,
        'mrzLine2':       lines[1] if len(lines) > 1 else None,
        'confidence':     min(100, int((d.get('valid_score', 0) or 0) * 100) if (d.get('valid_score', 0) or 0) <= 1.0 else int(d.get('valid_score', 0) or 0)),
        'method':         method,
    }


def _try_passporteye(image_path: str, method: str) -> Optional[dict]:
    """Run PassportEye on a single image path. Returns result dict or None."""
    if not PASSPORTEYE_AVAILABLE:
        return None
    try:
        mrz = read_mrz(image_path, save_roi=False)
        if mrz:
            return _extract_result_from_mrz(mrz, method)
    except Exception as e:
        print(f"PassportEye [{method}] error: {e}")
    return None


# ── OpenCV image preparation helpers ─────────────────────────────────────────

def _save_temp(img_array: "np.ndarray", suffix: str = '.png') -> str:
    """Save a numpy image array to a temp file and return the path."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    cv2.imwrite(tmp.name, img_array)
    tmp.close()
    return tmp.name


def make_rotations(image_path: str):
    if not CV2_AVAILABLE:
        return
    img = cv2.imread(image_path)
    if img is None:
        return
    for code, label in [
        (cv2.ROTATE_90_CLOCKWISE,        'rot90'),
        (cv2.ROTATE_180,                 'rot180'),
        (cv2.ROTATE_90_COUNTERCLOCKWISE, 'rot270'),
    ]:
        rotated = cv2.rotate(img, code)
        path = _save_temp(rotated)
        yield path, label


def make_grayscale(image_path: str) -> Optional[str]:
    if not CV2_AVAILABLE:
        return None
    img = cv2.imread(image_path)
    if img is None:
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    if max(h, w) < 1200:
        scale = 1200 / max(h, w)
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    return _save_temp(gray)


def make_binary(image_path: str) -> Optional[str]:
    if not CV2_AVAILABLE:
        return None
    img = cv2.imread(image_path)
    if img is None:
        return None
    h, w = img.shape[:2]
    if max(h, w) < 1200:
        scale = 1200 / max(h, w)
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=15,
        C=8,
    )
    return _save_temp(binary)


def make_mrz_crop(image_path: str, bottom_fraction: float = 0.40) -> Optional[str]:
    if not CV2_AVAILABLE:
        return None
    img = cv2.imread(image_path)
    if img is None:
        return None
    h, w = img.shape[:2]
    crop = img[int(h * (1 - bottom_fraction)):, :]
    return _save_temp(crop)


# ── Tesseract MRZ fallback ────────────────────────────────────────────────────

def _try_tesseract(image_path: str, method: str) -> Optional[dict]:
    """Run Tesseract OCR and try to extract MRZ lines."""
    if not TESSERACT_AVAILABLE:
        return None
    for psm in ['6', '11']:
        try:
            custom_config = (
                f'--oem 3 --psm {psm} '
                '-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'
            )
            img = Image.open(image_path)
            text = pytesseract.image_to_string(img, lang='eng', config=custom_config)
            lines = [l.strip() for l in text.splitlines() if l.strip()]

            mrz_lines = [l for l in lines if '<' in l and len(l) >= 30]
            if len(mrz_lines) >= 2:
                line1 = mrz_lines[0].replace(' ', '')
                line2 = mrz_lines[1].replace(' ', '')

                result = {
                    'passportNumber': None,
                    'firstName':      None,
                    'lastName':       None,
                    'dateOfBirth':    None,
                    'expiryDate':     None,
                    'nationality':    None,
                    'issuingCountry': None,
                    'sex':            None,
                    'mrzLine1':       line1,
                    'mrzLine2':       line2,
                    'confidence':     50,
                    'method':         f'{method}_psm{psm}',
                }

                if len(line2) >= 44:
                    result['passportNumber'] = line2[0:9].replace('<', '').strip() or None
                    result['nationality']    = line2[10:13].replace('<', '').strip() or None
                    result['dateOfBirth']    = parse_mrz_date(line2[13:19])
                    result['sex']            = line2[20] if line2[20] in ('M', 'F') else None
                    result['expiryDate']     = parse_mrz_date(line2[21:27])

                if len(line1) >= 10:
                    name_part = line1[5:] if line1[:2] == 'P<' else line1
                    if '<<' in name_part:
                        parts = name_part.split('<<', 1)
                        result['lastName']  = clean_name(parts[0])
                        result['firstName'] = clean_name(parts[1]) if len(parts) > 1 else None
                    if line1[:2] == 'P<':
                        result['issuingCountry'] = line1[2:5].replace('<', '').strip() or None

                return result

        except Exception as e:
            print(f"Tesseract [{method} psm{psm}] error: {e}")

    return None


# ── VIZ (Visual Inspection Zone) reader ──────────────────────────────────────

def _read_viz_fields(image_path: str) -> dict:
    """
    Use Tesseract to read fields from the Visual Inspection Zone (top ~75%):
      - dateOfIssue  (not in MRZ)
      - placeOfBirth (not in MRZ)
      - personalNo   (National ID — MRZ personal number field often empty)

    Returns dict with those three keys (None if not found).
    """
    result: dict = {'dateOfIssue': None, 'placeOfBirth': None, 'personalNo': None}

    if not TESSERACT_AVAILABLE or not CV2_AVAILABLE:
        return result

    try:
        img = cv2.imread(image_path)
        if img is None:
            return result

        h, w = img.shape[:2]
        # Crop VIZ zone — top 75% (MRZ is at the bottom ~25%)
        viz = img[0:int(h * 0.75), :]

        # Upscale to at least 2400px on the longest side for better OCR
        long_side = max(viz.shape[:2])
        if long_side < 2400:
            scale = 2400 / long_side
            viz = cv2.resize(viz, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        # CLAHE on grayscale for contrast
        gray = cv2.cvtColor(viz, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)

        pil_img = Image.fromarray(gray)
        raw = pytesseract.image_to_string(pil_img, lang='eng', config='--oem 3 --psm 6')
        text = '\n'.join(l.rstrip() for l in raw.splitlines())

        # ── Date of Issue ─────────────────────────────────────────────────────
        doi = re.search(
            r'(?:Date\s+of\s+Issue|Date\s+of\s+Issuance|Issuance\s+Date)[^\n]{0,30}\n?\s*'
            r'(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}'
            r'|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4})',
            text, re.IGNORECASE,
        )
        if doi:
            result['dateOfIssue'] = _parse_viz_date(doi.group(1))

        # ── Place of Birth ────────────────────────────────────────────────────
        pob = re.search(
            r'(?:Place\s+of\s+Birth|Birth\s*Place|Birthplace)[^\n]{0,20}\n?\s*'
            r'([A-Z][A-Z /\-]{1,40}?)(?:\s*\n|\s{2,}|$)',
            text, re.IGNORECASE,
        )
        if pob:
            place = pob.group(1).strip()
            # Keep only the English part (before '/')
            if '/' in place:
                place = place.split('/')[0].strip()
            # Discard if it looks like a label rather than a value
            bad = {'DATE', 'PLACE', 'BIRTH', 'EXPIRY', 'ISSUE', 'PERSONAL', 'NAME'}
            if len(place) >= 2 and place.upper() not in bad:
                result['placeOfBirth'] = place.title()

        # ── Personal No. / National ID ────────────────────────────────────────
        pid = re.search(
            r'(?:Personal\s*No\.?|National\s*ID|ID\s*No\.?)[^\n]{0,20}\n?\s*(\d[\d\s]{10,14}\d)',
            text, re.IGNORECASE,
        )
        if pid:
            pid_clean = re.sub(r'\s+', '', pid.group(1))
            if len(pid_clean) >= 10:
                result['personalNo'] = pid_clean

        print(f"[viz] dateOfIssue={result['dateOfIssue']} "
              f"placeOfBirth={result['placeOfBirth']} "
              f"personalNo={result['personalNo']}")

    except Exception as e:
        print(f"[viz] error: {e}")

    return result


# ── MRZ scanner (internal) ────────────────────────────────────────────────────

def _scan_mrz(image_path: str) -> Optional[dict]:
    """
    Try all MRZ strategies in order. Returns the first successful result or None.
    """
    temp_files: list = []

    def track(path: Optional[str]) -> Optional[str]:
        if path:
            temp_files.append(path)
        return path

    try:
        # Strategy 1: PassportEye on original
        r = _try_passporteye(image_path, 'passporteye_original')
        if r:
            return r

        if CV2_AVAILABLE:
            # Strategy 2: Rotations of original
            for rot_path, label in make_rotations(image_path):
                track(rot_path)
                r = _try_passporteye(rot_path, f'passporteye_{label}')
                if r:
                    return r

            # Strategy 3: Grayscale (CLAHE, no binary)
            gray_path = track(make_grayscale(image_path))
            if gray_path:
                r = _try_passporteye(gray_path, 'passporteye_gray')
                if r:
                    return r
                for rot_path, label in make_rotations(gray_path):
                    track(rot_path)
                    r = _try_passporteye(rot_path, f'passporteye_gray_{label}')
                    if r:
                        return r

            # Strategy 4: MRZ crop from original (bottom 40%)
            crop_path = track(make_mrz_crop(image_path, bottom_fraction=0.40))
            if crop_path:
                r = _try_passporteye(crop_path, 'passporteye_mrz_crop')
                if r:
                    return r

            # Strategy 5: Binary-preprocessed image
            binary_path = track(make_binary(image_path))
            if binary_path:
                r = _try_passporteye(binary_path, 'passporteye_binary')
                if r:
                    return r
                binary_crop = track(make_mrz_crop(binary_path, bottom_fraction=0.40))
                if binary_crop:
                    r = _try_passporteye(binary_crop, 'passporteye_binary_crop')
                    if r:
                        return r

        # Strategy 6 & 7: Tesseract fallback
        if TESSERACT_AVAILABLE:
            gray_path2 = track(make_grayscale(image_path)) if CV2_AVAILABLE else None
            for tgt, method in [
                (gray_path2 or image_path, 'tesseract_gray'),
                (image_path,               'tesseract_original'),
            ]:
                r = _try_tesseract(tgt, method)
                if r:
                    return r

    finally:
        for path in temp_files:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except OSError:
                    pass

    return None


# ── Public API ────────────────────────────────────────────────────────────────

def scan_passport_image(image_path: str) -> dict:
    """
    Scan a passport image.

    1. Runs MRZ strategies (PassportEye → Tesseract).
    2. Always runs VIZ reader (Tesseract on top 75%) to extract
       dateOfIssue, placeOfBirth, personalNo — fields absent from MRZ.
    3. Merges and returns combined result.
    """
    # ── Step 1: MRZ ──────────────────────────────────────────────────────────
    mrz = _scan_mrz(image_path)

    if mrz:
        print(f"[scanner] MRZ success via {mrz['method']} (confidence {mrz.get('confidence')}%)")
    else:
        print("[scanner] MRZ: all strategies failed")

    # ── Step 2: VIZ ──────────────────────────────────────────────────────────
    viz = _read_viz_fields(image_path)

    # ── Step 3: Merge ─────────────────────────────────────────────────────────
    if mrz is None:
        viz_found = any(v is not None for v in viz.values())
        mrz = {
            'passportNumber': None,
            'firstName':      None,
            'lastName':       None,
            'dateOfBirth':    None,
            'expiryDate':     None,
            'nationality':    None,
            'issuingCountry': None,
            'sex':            None,
            'mrzLine1':       None,
            'mrzLine2':       None,
            'confidence':     30 if viz_found else 0,
            'method':         'viz_only' if viz_found else 'none',
        }
        if not viz_found:
            mrz['message'] = 'Could not extract data. Please enter passport details manually.'

    # VIZ fields supplement MRZ (never overwrite MRZ data)
    mrz['dateOfIssue'] = viz.get('dateOfIssue')
    mrz['placeOfBirth'] = viz.get('placeOfBirth')
    mrz['personalNo']  = viz.get('personalNo')

    print(f"[scanner] final method={mrz['method']} "
          f"viz=dateOfIssue:{viz.get('dateOfIssue')} "
          f"placeOfBirth:{viz.get('placeOfBirth')} "
          f"personalNo:{viz.get('personalNo')}")
    return mrz
