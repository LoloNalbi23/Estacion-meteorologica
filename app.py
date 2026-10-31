import os
from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory
import firebase_admin
from firebase_admin import credentials

# Carpeta donde está este archivo. Sirve igual en tu PC y en PythonAnywhere,
# donde el "directorio actual" NO es la carpeta del proyecto.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Lee el archivo .env que está junto a app.py
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Ruta de la clave de administrador de Firebase
ruta_clave = os.environ.get('FIREBASE_CREDENTIALS')
if not ruta_clave:
    raise RuntimeError(
        'Falta la variable FIREBASE_CREDENTIALS. Revisá que exista el archivo '
        f'.env en {BASE_DIR} y que tenga una línea FIREBASE_CREDENTIALS=...'
    )

# Si la ruta es relativa (como en tu PC), se cuenta desde la carpeta del proyecto
if not os.path.isabs(ruta_clave):
    ruta_clave = os.path.join(BASE_DIR, ruta_clave)

if not os.path.isfile(ruta_clave):
    raise RuntimeError(f'No se encontró la clave de Firebase en: {ruta_clave}')

# Conectar con Firebase usando la clave de administrador
firebase_admin.initialize_app(credentials.Certificate(ruta_clave))

from routes.lecturas import lecturas_bp

# Carpeta con la web ya construida (se genera en tu PC con "npm run build")
DIST_DIR = os.path.join(BASE_DIR, 'dist')

app = Flask(__name__, static_folder=None)
app.json.ensure_ascii = False  # que las tildes se vean bien en las respuestas
app.register_blueprint(lecturas_bp)


@app.get('/api/estado')
def estado():
    return {'estado': 'ok', 'servicio': 'Estación meteorológica'}


# ── La web (React) ────────────────────────────────────────────────
# Sirve los archivos de dist/. Cualquier ruta que no sea un archivo
# (/history, /alertas, /proyecto...) devuelve index.html: de ahí en adelante
# la resuelve React Router en el navegador.
@app.get('/', defaults={'ruta': ''})
@app.get('/<path:ruta>')
def web(ruta):
    # Una ruta /api/... que no existe tiene que dar 404, no la página web
    if ruta.startswith('api/'):
        return jsonify(error='No encontrado'), 404

    if not os.path.isfile(os.path.join(DIST_DIR, 'index.html')):
        return (
            'Falta la carpeta dist/. Generala en tu PC con "npm run build" '
            'y subila al servidor.',
            503,
        )

    if ruta and os.path.isfile(os.path.join(DIST_DIR, ruta)):
        return send_from_directory(DIST_DIR, ruta)

    return send_from_directory(DIST_DIR, 'index.html')


if __name__ == '__main__':
    # host 0.0.0.0 permite que otros dispositivos de la red (el ESP32) lleguen
    app.run(host='0.0.0.0', port=5000)