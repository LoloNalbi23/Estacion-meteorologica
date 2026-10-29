import os
from dotenv import load_dotenv
from flask import Flask
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

app = Flask(__name__)
app.register_blueprint(lecturas_bp)


@app.get('/')
def inicio():
    return {'estado': 'ok', 'servicio': 'Estación meteorológica'}


if __name__ == '__main__':
    # host 0.0.0.0 permite que otros dispositivos de la red (el ESP32) lleguen
    app.run(host='0.0.0.0', port=5000)