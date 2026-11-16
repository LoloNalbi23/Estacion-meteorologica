import os
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from firebase_admin import firestore

lecturas_bp = Blueprint('lecturas', __name__)

# Contrato de datos: temperatura en °C, humedad relativa en %,
# velocidad del viento en km/h y CO en ppm. La presión en hPa es opcional.
# El máximo de viento es un control amplio de plausibilidad, no una
# especificación del anemómetro (su modelo/calibración aún no se definieron).
CAMPOS_REQUERIDOS = {
    'temperatura': (-40, 85),
    'humedad': (0, 100),
    'velocidad_viento': (0, 500),
    'co_concentracion': (0, 500),
}
CAMPOS_OPCIONALES = {
    'presion': (300, 1100),
}


@lecturas_bp.post('/api/lecturas')
def crear_lectura():
    # 1. Autenticación: la clave debe coincidir con la del .env
    clave = os.environ.get('API_KEY_SENSOR')
    if not clave or request.headers.get('X-API-Key') != clave:
        return jsonify(error='No autorizado'), 401

    # 2. El cuerpo tiene que ser un JSON válido
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify(error='El cuerpo debe ser un JSON'), 400

    # 3. Validar los campos obligatorios y, si llega, la presión opcional.
    lectura = {}
    for campo, (minimo, maximo) in CAMPOS_REQUERIDOS.items():
        valor = datos.get(campo)
        if isinstance(valor, bool) or not isinstance(valor, (int, float)):
            return jsonify(error=f'Falta {campo} o no es un número'), 400
        if not (minimo <= valor <= maximo):
            return jsonify(error=f'{campo} fuera de rango ({minimo} a {maximo})'), 400
        lectura[campo] = valor

    for campo, (minimo, maximo) in CAMPOS_OPCIONALES.items():
        if campo not in datos or datos[campo] is None:
            continue
        valor = datos[campo]
        if isinstance(valor, bool) or not isinstance(valor, (int, float)):
            return jsonify(error=f'{campo} debe ser un número cuando se envía'), 400
        if not (minimo <= valor <= maximo):
            return jsonify(error=f'{campo} fuera de rango ({minimo} a {maximo})'), 400
        lectura[campo] = valor

    # 4. La fecha la pone el servidor, no el sensor
    lectura['timestamp'] = datetime.now(timezone.utc)

    # 5. Guardar en Firestore
    db = firestore.client()
    _, ref = db.collection('lecturas').add(lectura)

    return jsonify(ok=True, id=ref.id), 201
