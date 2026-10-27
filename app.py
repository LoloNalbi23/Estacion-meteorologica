import os
from dotenv import load_dotenv
from flask import Flask
import firebase_admin
from firebase_admin import credentials

load_dotenv()

# Conectar con Firebase usando la clave de administrador
firebase_admin.initialize_app(
    credentials.Certificate(os.environ['FIREBASE_CREDENTIALS'])
)

from routes.lecturas import lecturas_bp

app = Flask(__name__)
app.register_blueprint(lecturas_bp)


@app.get('/')
def inicio():
    return {'estado': 'ok', 'servicio': 'Estación meteorológica'}


if __name__ == '__main__':
    # host 0.0.0.0 permite que otros dispositivos de la red (el ESP32) lleguen
    app.run(host='0.0.0.0', port=5000)