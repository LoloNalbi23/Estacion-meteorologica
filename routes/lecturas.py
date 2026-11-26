import hmac
import os
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from firebase_admin import firestore

lecturas_bp = Blueprint('lecturas', __name__)

# Contrato de datos: cada medición es opcional y puede omitirse o ser null.
# Una lectura debe traer al menos un valor numérico. Las unidades son:
# temperatura (°C), humedad relativa (%), viento (km/h), CO (ppm), presión (hPa).
# El máximo de viento es un control amplio de plausibilidad, no una
# especificación del anemómetro (su modelo/calibración aún no se definieron).
CAMPOS_MEDICION = {
    'temperatura': (-40, 85),
    'humedad': (0, 100),
    'velocidad_viento': (0, 500),
    'co_concentracion': (0, 500),
    'presion': (300, 1100),
}


@lecturas_bp.post('/api/lecturas')
def crear_lectura():
    # 1. Autenticación: la clave debe coincidir con la del .env.
    # compare_digest tarda lo mismo acierte o no, así nadie puede adivinar la
    # clave carácter por carácter midiendo cuánto tarda la respuesta.
    clave = os.environ.get('API_KEY_SENSOR')
    recibida = request.headers.get('X-API-Key', '')
    if not clave or not hmac.compare_digest(recibida.encode(), clave.encode()):
        return jsonify(error='No autorizado'), 401

    # 2. El cuerpo tiene que ser un JSON válido
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify(error='El cuerpo debe ser un JSON'), 400

    # 3. Validar de forma independiente los campos recibidos. Los ausentes o
    # nulos quedan fuera del documento; cualquier valor presente debe ser válido.
    lectura = {}
    for campo, (minimo, maximo) in CAMPOS_MEDICION.items():
        valor = datos.get(campo)
        if valor is None:
            continue
        if isinstance(valor, bool) or not isinstance(valor, (int, float)):
            return jsonify(error=f'{campo} debe ser un número o null'), 400
        if not (minimo <= valor <= maximo):
            return jsonify(error=f'{campo} fuera de rango ({minimo} a {maximo})'), 400
        lectura[campo] = valor

    if not lectura:
        return jsonify(error='La lectura debe incluir al menos una medición numérica'), 400

    # 4. La fecha la pone el servidor, no el sensor
    lectura['timestamp'] = datetime.now(timezone.utc)

    # 5. Guardar en Firestore
    db = firestore.client()
    _, ref = db.collection('lecturas').add(lectura)

    return jsonify(ok=True, id=ref.id), 201
