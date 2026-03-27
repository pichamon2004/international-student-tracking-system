from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import traceback
import warnings

# Suppress FutureWarnings from passporteye/scikit-image deprecated API usage
warnings.filterwarnings('ignore', category=FutureWarning, module='skimage')
warnings.filterwarnings('ignore', category=FutureWarning, module='passporteye')

from passport_scanner import scan_passport_image

app = Flask(__name__)
CORS(app)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/scan-passport', methods=['POST'])
def scan_passport():
    if 'image' not in request.files:
        return jsonify({'success': False, 'message': 'No image file provided'}), 400

    file = request.files['image']
    if not file.filename:
        return jsonify({'success': False, 'message': 'Empty filename'}), 400

    suffix = os.path.splitext(file.filename)[1] or '.jpg'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        result = scan_passport_image(tmp_path)
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('DEBUG', 'false').lower() == 'true')
