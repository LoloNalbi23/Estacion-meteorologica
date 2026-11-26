"""
Carga datos aleatorios en Firestore para probar el Dashboard y el Historial.

Escribe directamente en la colección 'lecturas' con la clave de administrador
de Firebase (FIREBASE_CREDENTIALS del .env), sin pasar por Flask. Los valores
son ficticios y siguen el mismo contrato que las mediciones reales:

    temperatura (°C), humedad (%), velocidad_viento (km/h),
    co_concentracion (ppm), presion (hPa, opcional), timestamp (UTC).

Uso:
    python scripts/datos_random.py
        # 288 lecturas: últimas 24 h, una cada 5 minutos
    python scripts/datos_random.py -n 1000 -d 7
        # 1000 lecturas repartidas en los últimos 7 días
    python scripts/datos_random.py -n 300 -d 365
        # 300 lecturas repartidas en el último año (para el gráfico anual)
    python scripts/datos_random.py --sin-presion
        # omite la presión, como cuando el BME280 no está conectado
    python scripts/datos_random.py --cantidad 0
        # solo muestra cuántas lecturas se van a generar (no escribe)

Los datos se generan con un "paseo aleatorio" alrededor de valores
plausibles, para que los gráficos se vean continuos y no como ruido plano.
No representan mediciones reales de los sensores.
"""

import argparse
import math
import os
import random
import sys
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

# Carpeta del proyecto (un nivel arriba de scripts/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Firestore acepta como máximo 500 operaciones por batch
MAX_POR_BATCH = 500


def parsear_argumentos():
    parser = argparse.ArgumentParser(
        description='Genera lecturas aleatorias y las guarda en Firestore.',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        '-n', '--cantidad', type=int, default=288,
        help='cantidad de lecturas a generar',
    )
    parser.add_argument(
        '-d', '--dias', type=float, default=1,
        help='período hacia atrás, en días, en el que se reparten las lecturas',
    )
    parser.add_argument(
        '--sin-presion', action='store_true',
        help='no incluir el campo presion',
    )
    parser.add_argument(
        '--semilla', type=int, default=None,
        help='semilla para que la misma corrida genere los mismos valores',
    )
    return parser.parse_args()


def conectar_firestore():
    """Inicializa firebase-admin con la clave indicada en el .env."""
    import firebase_admin
    from firebase_admin import credentials, firestore

    ruta_clave = os.environ.get('FIREBASE_CREDENTIALS')
    if not ruta_clave:
        sys.exit(
            'Falta FIREBASE_CREDENTIALS en el .env: no se puede escribir en '
            'Firestore sin la clave de administrador.'
        )

    if not os.path.isabs(ruta_clave):
        ruta_clave = os.path.join(BASE_DIR, ruta_clave)

    if not os.path.isfile(ruta_clave):
        sys.exit(f'No se encontró la clave de Firebase en: {ruta_clave}')

    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(ruta_clave))

    return firestore.client()


def limitar(valor, minimo, maximo):
    return min(maximo, max(minimo, valor))


def generar_lecturas(cantidad, dias, incluir_presion, rng):
    """
    Devuelve una lista de (timestamp, documento) ordenada de la más vieja a la
    más nueva. Los valores evolucionan con un paseo aleatorio y la temperatura
    y la humedad siguen un ciclo diario suave.
    """
    ahora = datetime.now(timezone.utc)
    inicio = ahora - timedelta(days=dias)
    paso = (ahora - inicio) / max(1, cantidad)
    # Jitter de ±40 % del paso para que los puntos no queden perfectamente
    # equiespaciados, pero siempre dentro del período pedido.
    jitter = paso * 0.4

    temperatura = rng.uniform(18, 24)
    humedad = rng.uniform(50, 70)
    viento = rng.uniform(2, 15)
    co = rng.uniform(0, 4)
    presion = rng.uniform(1008, 1018)

    lecturas = []
    for i in range(cantidad):
        momento = inicio + paso * i + timedelta(
            seconds=rng.uniform(-jitter.total_seconds(), jitter.total_seconds())
        )
        if momento > ahora:
            momento = ahora - timedelta(seconds=rng.uniform(0, 5))

        # Hora local aproximada (Argentina, UTC-3) para el ciclo diario:
        # la temperatura máxima cae cerca de las 15 h.
        hora = (momento.hour - 3) % 24
        ciclo = math.sin((hora - 9) / 24 * 2 * math.pi)

        # Cada variable vuelve suavemente hacia un valor típico (media
        # revertida), así los picos no se acumulan ni saturan el gráfico.
        objetivo_temp = 21 + 6 * ciclo
        temperatura += (objetivo_temp - temperatura) * 0.25 + rng.uniform(-0.6, 0.6)
        temperatura = limitar(temperatura, 5, 40)

        objetivo_humedad = 65 - (temperatura - 20) * 2
        humedad += (objetivo_humedad - humedad) * 0.2 + rng.uniform(-1.5, 1.5)
        humedad = limitar(humedad, 20, 95)

        viento += (12 - viento) * 0.15 + rng.uniform(-3.5, 3.5)
        if rng.random() < 0.05:  # ráfaga ocasional
            viento += rng.uniform(8, 25)
        viento = limitar(viento, 0, 80)

        co += (2 - co) * 0.25 + rng.uniform(-1.2, 1.2)
        if rng.random() < 0.04:  # pico ocasional de CO
            co += rng.uniform(8, 35)
        co = limitar(co, 0, 120)

        presion += (1013 - presion) * 0.03 + rng.uniform(-0.3, 0.3)
        presion = limitar(presion, 995, 1030)

        documento = {
            'temperatura': round(temperatura, 1),
            'humedad': round(humedad, 1),
            'velocidad_viento': round(viento, 1),
            'co_concentracion': round(co, 1),
        }
        if incluir_presion:
            documento['presion'] = round(presion, 1)

        documento['timestamp'] = momento
        lecturas.append(documento)

    return lecturas


def guardar(db, lecturas):
    """Escribe los documentos en Firestore por batches de 500."""
    coleccion = db.collection('lecturas')
    guardadas = 0

    for inicio in range(0, len(lecturas), MAX_POR_BATCH):
        lote = db.batch()
        for documento in lecturas[inicio:inicio + MAX_POR_BATCH]:
            lote.set(coleccion.document(), documento)
        lote.commit()
        guardadas += len(lecturas[inicio:inicio + MAX_POR_BATCH])
        print(f'  {guardadas}/{len(lecturas)} lecturas guardadas...')

    return guardadas


def main():
    args = parsear_argumentos()

    if args.cantidad < 0:
        sys.exit('La cantidad no puede ser negativa.')
    if args.dias <= 0:
        sys.exit('Los días deben ser mayores que cero.')

    if args.cantidad == 0:
        print('Cantidad 0: no se genera ni se escribe nada.')
        return

    rng = random.Random(args.semilla)
    lecturas = generar_lecturas(
        cantidad=args.cantidad,
        dias=args.dias,
        incluir_presion=not args.sin_presion,
        rng=rng,
    )

    desde = lecturas[0]['timestamp']
    hasta = lecturas[-1]['timestamp']
    print(
        f'Generando {len(lecturas)} lecturas entre '
        f'{desde:%Y-%m-%d %H:%M} y {hasta:%Y-%m-%d %H:%M} UTC '
        f'({"con" if not args.sin_presion else "sin"} presión).'
    )

    db = conectar_firestore()
    total = guardar(db, lecturas)
    print(f'Listo: {total} lecturas nuevas en la colección "lecturas".')


if __name__ == '__main__':
    main()
