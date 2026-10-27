import os
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from firebase_admin import firestore

lecturas_bp = Blueprint('lecturas', __name__)

# Cada campo con su rango válido (mínimo, máximo)
CAMPOS = {
    'temperatura': (-40, 85),
    'humedad': (0, 100),
    'presion': (800, 1100),
    'luminosidad': (0, 200000),
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

    # 3. Validar cada campo: que exista, que sea número y que esté en rango
    lectura = {}
    for campo, (minimo, maximo) in CAMPOS.items():
        valor = datos.get(campo)
        if isinstance(valor, bool) or not isinstance(valor, (int, float)):
            return jsonify(error=f'Falta {campo} o no es un número'), 400
        if not (minimo <= valor <= maximo):
            return jsonify(error=f'{campo} fuera de rango ({minimo} a {maximo})'), 400
        lectura[campo] = valor

    # 4. La fecha la pone el servidor, no el sensor
    lectura['timestamp'] = datetime.now(timezone.utc)

    # 5. Guardar en Firestore
    db = firestore.client()
    _, ref = db.collection('lecturas').add(lectura)

    return jsonify(ok=True, id=ref.id), 201