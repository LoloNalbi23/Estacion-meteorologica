"""Tests del servidor Flask: recepción de lecturas en POST /api/lecturas.

No necesitan Firebase ni la clave de administrador: firebase_admin se
reemplaza por un doble que guarda los documentos en una lista en memoria.

Ejecutar desde la carpeta del proyecto:

    pip install -r requirements-dev.txt
    pytest
"""

import sys
import types
from datetime import datetime, timedelta, timezone

import pytest

CLAVE = 'clave-de-prueba'
URL = '/api/lecturas'


def instalar_firebase_falso(monkeypatch, guardados):
    """Reemplaza firebase_admin por módulos falsos; devuelve nada."""

    class Referencia:
        def __init__(self, numero):
            self.id = f'doc-{numero}'

    class Coleccion:
        def __init__(self, nombre):
            self.nombre = nombre

        def add(self, documento):
            guardados.append((self.nombre, documento))
            return None, Referencia(len(guardados))

    class Cliente:
        def collection(self, nombre):
            return Coleccion(nombre)

    raiz = types.ModuleType('firebase_admin')
    firestore = types.ModuleType('firebase_admin.firestore')
    credentials = types.ModuleType('firebase_admin.credentials')

    firestore.client = lambda: Cliente()
    credentials.Certificate = lambda ruta: {'ruta': ruta}
    raiz.initialize_app = lambda cred: None
    raiz.firestore = firestore
    raiz.credentials = credentials

    monkeypatch.setitem(sys.modules, 'firebase_admin', raiz)
    monkeypatch.setitem(sys.modules, 'firebase_admin.firestore', firestore)
    monkeypatch.setitem(sys.modules, 'firebase_admin.credentials', credentials)


@pytest.fixture
def guardados():
    return []


@pytest.fixture
def cliente(monkeypatch, tmp_path, guardados):
    instalar_firebase_falso(monkeypatch, guardados)

    # app.py exige que exista el archivo de credenciales: alcanza uno vacío.
    clave_json = tmp_path / 'clave.json'
    clave_json.write_text('{}', encoding='utf-8')
    monkeypatch.setenv('FIREBASE_CREDENTIALS', str(clave_json))
    monkeypatch.setenv('API_KEY_SENSOR', CLAVE)

    # Importar de cero para que app.py use los módulos falsos de este test.
    for modulo in ('app', 'routes.lecturas'):
        monkeypatch.delitem(sys.modules, modulo, raising=False)
    import app as modulo_app

    modulo_app.app.config['TESTING'] = True
    with modulo_app.app.test_client() as c:
        yield c


def enviar(cliente, cuerpo=None, clave=CLAVE, **kwargs):
    headers = {'X-API-Key': clave} if clave is not None else {}
    return cliente.post(URL, json=cuerpo, headers=headers, **kwargs)


# ── Servidor ──────────────────────────────────────────────────────────

def test_estado_responde_ok(cliente):
    respuesta = cliente.get('/api/estado')
    assert respuesta.status_code == 200
    assert respuesta.get_json()['estado'] == 'ok'


def test_ruta_api_inexistente_da_404(cliente):
    respuesta = cliente.get('/api/no-existe')
    assert respuesta.status_code == 404


# ── Autenticación ─────────────────────────────────────────────────────

def test_sin_clave_se_rechaza(cliente, guardados):
    respuesta = enviar(cliente, {'temperatura': 20}, clave=None)
    assert respuesta.status_code == 401
    assert guardados == []


def test_clave_incorrecta_se_rechaza(cliente, guardados):
    respuesta = enviar(cliente, {'temperatura': 20}, clave='otra-clave')
    assert respuesta.status_code == 401
    assert guardados == []


def test_clave_con_caracteres_raros_no_rompe_el_servidor(cliente, guardados):
    respuesta = enviar(cliente, {'temperatura': 20}, clave='ñandú-🌡')
    assert respuesta.status_code == 401
    assert guardados == []


# ── Lecturas válidas ──────────────────────────────────────────────────

def test_lectura_completa_se_guarda(cliente, guardados):
    lectura = {
        'temperatura': 24.3,
        'humedad': 58,
        'velocidad_viento': 12.5,
        'co_concentracion': 3.1,
        'presion': 1013.2,
    }
    respuesta = enviar(cliente, lectura)

    assert respuesta.status_code == 201
    assert respuesta.get_json() == {'ok': True, 'id': 'doc-1'}
    coleccion, documento = guardados[0]
    assert coleccion == 'lecturas'
    for campo, valor in lectura.items():
        assert documento[campo] == valor


def test_lectura_parcial_guarda_solo_lo_medido(cliente, guardados):
    # Si un sensor no responde, el ESP32 omite el campo o lo manda en null.
    respuesta = enviar(cliente, {'temperatura': 21, 'humedad': None})

    assert respuesta.status_code == 201
    _, documento = guardados[0]
    assert documento['temperatura'] == 21
    assert 'humedad' not in documento
    assert 'presion' not in documento


def test_la_fecha_la_pone_el_servidor(cliente, guardados):
    antes = datetime.now(timezone.utc)
    enviar(cliente, {'temperatura': 21, 'timestamp': '2001-01-01T00:00:00Z'})

    _, documento = guardados[0]
    assert documento['timestamp'].tzinfo is not None
    assert antes - timedelta(seconds=1) <= documento['timestamp'] <= datetime.now(timezone.utc)


def test_campos_desconocidos_se_ignoran(cliente, guardados):
    enviar(cliente, {'temperatura': 21, 'lluvia': 5})
    _, documento = guardados[0]
    assert 'lluvia' not in documento


@pytest.mark.parametrize('campo, valor', [
    ('temperatura', -40),
    ('temperatura', 85),
    ('humedad', 0),
    ('humedad', 100),
    ('presion', 300),
    ('presion', 1100),
])
def test_limites_del_rango_se_aceptan(cliente, campo, valor):
    assert enviar(cliente, {campo: valor}).status_code == 201


# ── Lecturas inválidas ────────────────────────────────────────────────

@pytest.mark.parametrize('cuerpo', [{}, {'temperatura': None, 'humedad': None}])
def test_sin_mediciones_se_rechaza(cliente, guardados, cuerpo):
    assert enviar(cliente, cuerpo).status_code == 400
    assert guardados == []


@pytest.mark.parametrize('valor', ['25', True, [25], {'v': 25}])
def test_tipos_invalidos_se_rechazan(cliente, guardados, valor):
    assert enviar(cliente, {'temperatura': valor}).status_code == 400
    assert guardados == []


@pytest.mark.parametrize('campo, valor', [
    ('temperatura', 85.1),
    ('temperatura', -41),
    ('humedad', 101),
    ('velocidad_viento', -1),
    ('co_concentracion', 501),
    ('presion', 299),
])
def test_fuera_de_rango_se_rechaza(cliente, guardados, campo, valor):
    assert enviar(cliente, {campo: valor}).status_code == 400
    assert guardados == []


@pytest.mark.parametrize('texto', ['NaN', 'Infinity', '-Infinity'])
def test_nan_e_infinito_se_rechazan(cliente, guardados, texto):
    # El JSON de Python acepta NaN/Infinity; no deben llegar a Firestore.
    respuesta = cliente.post(
        URL,
        data=f'{{"temperatura": {texto}}}',
        content_type='application/json',
        headers={'X-API-Key': CLAVE},
    )
    assert respuesta.status_code == 400
    assert guardados == []


@pytest.mark.parametrize('cuerpo', ['no es json', '[1, 2, 3]', '25'])
def test_cuerpo_que_no_es_un_objeto_json_se_rechaza(cliente, guardados, cuerpo):
    respuesta = cliente.post(
        URL, data=cuerpo, content_type='application/json', headers={'X-API-Key': CLAVE},
    )
    assert respuesta.status_code == 400
    assert guardados == []


def test_cuerpo_demasiado_grande_se_rechaza(cliente, guardados):
    cuerpo = '{"temperatura": 20, "relleno": "' + 'x' * 10_000 + '"}'
    respuesta = cliente.post(
        URL, data=cuerpo, content_type='application/json', headers={'X-API-Key': CLAVE},
    )
    assert respuesta.status_code == 413
    assert guardados == []
