"""
Passport scanner using PassportEye (MRZ) + Tesseract OCR.
"""
import re
from datetime import datetime, date
from typing import Optional

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


def parse_mrz_date(date_str: str) -> Optional[str]:
    """Parse MRZ date (YYMMDD) to ISO format (YYYY-MM-DD)."""
    if not date_str or len(date_str) != 6:
        return None
    try:
        yy = int(date_str[:2])
        mm = int(date_str[2:4])
        dd = int(date_str[4:6])
        current_year = date.today().year % 100
        century = 2000 if yy <= current_year + 10 else 1900
        return f"{century + yy:04d}-{mm:02d}-{dd:02d}"
    except ValueError:
        return None


def clean_name(name_str: str) -> str:
    """Convert MRZ name format (LAST<<FIRST<MIDDLE) to readable name."""
    return name_str.replace('<', ' ').strip()


def scan_passport_image(image_path: str) -> dict:
    """
    Scan passport image and extract data using MRZ (PassportEye) and OCR (Tesseract).
    Returns extracted passport data as a dict.
    """
    result = {
        'passportNumber': None,
        'firstName': None,
        'lastName': None,
        'dateOfBirth': None,
        'expiryDate': None,
        'nationality': None,
        'issuingCountry': None,
        'sex': None,
        'mrzLine1': None,
        'mrzLine2': None,
        'confidence': 0,
        'method': None,
    }

    # --- Method 1: PassportEye MRZ ---
    if PASSPORTEYE_AVAILABLE:
        try:
            mrz = read_mrz(image_path, save_roi=False)
            if mrz:
                mrz_data = mrz.to_dict()
                names = mrz_data.get('names', '')
                surname = mrz_data.get('surname', '')

                result['passportNumber'] = mrz_data.get('number', '').replace('<', '').strip() or None
                result['lastName'] = clean_name(surname)
                result['firstName'] = clean_name(names)
                result['nationality'] = mrz_data.get('nationality', '').replace('<', '').strip() or None
                result['issuingCountry'] = mrz_data.get('country', '').replace('<', '').strip() or None
                result['sex'] = mrz_data.get('sex', '').replace('<', '').strip() or None
                result['dateOfBirth'] = parse_mrz_date(mrz_data.get('date_of_birth', ''))
                result['expiryDate'] = parse_mrz_date(mrz_data.get('expiration_date', ''))
                result['mrzLine1'] = mrz_data.get('raw_text', '').split('\n')[0] if mrz_data.get('raw_text') else None
                result['mrzLine2'] = mrz_data.get('raw_text', '').split('\n')[1] if mrz_data.get('raw_text') and '\n' in mrz_data.get('raw_text', '') else None
                result['confidence'] = int(mrz_data.get('valid_score', 0) * 100)
                result['method'] = 'mrz'
                return result
        except Exception as e:
            print(f"PassportEye error: {e}")

    # --- Method 2: Tesseract OCR fallback ---
    if TESSERACT_AVAILABLE:
        try:
            img = Image.open(image_path)
            text = pytesseract.image_to_string(img, lang='eng')
            lines = [l.strip() for l in text.splitlines() if l.strip()]

            # Try to find MRZ lines (lines with < characters, 44 chars each)
            mrz_lines = [l for l in lines if '<' in l and len(l) >= 30]
            if len(mrz_lines) >= 2:
                result['mrzLine1'] = mrz_lines[0]
                result['mrzLine2'] = mrz_lines[1]
                # Parse line 2 manually (type TD3: 44 chars)
                line2 = mrz_lines[1].replace(' ', '')
                if len(line2) >= 44:
                    result['passportNumber'] = line2[0:9].replace('<', '').strip() or None
                    result['nationality'] = line2[10:13].replace('<', '').strip() or None
                    result['dateOfBirth'] = parse_mrz_date(line2[13:19])
                    result['expiryDate'] = parse_mrz_date(line2[21:27])
                result['confidence'] = 40
                result['method'] = 'ocr_mrz'
            else:
                # Partial OCR: just return raw text for manual entry
                result['rawText'] = '\n'.join(lines[:20])
                result['confidence'] = 10
                result['method'] = 'ocr_raw'
            return result
        except Exception as e:
            print(f"Tesseract error: {e}")

    result['method'] = 'none'
    result['message'] = 'No scanning library available. Install passporteye or pytesseract.'
    return result
