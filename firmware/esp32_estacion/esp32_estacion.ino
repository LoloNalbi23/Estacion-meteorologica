#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <math.h>
#include <string.h>
#include "secrets.h"

// Base para ESP32 DevKit + Arduino IDE.
// Instalar la biblioteca "DHT sensor library" de Adafruit.
// La API espera temperatura (°C), humedad (%), viento (km/h) y CO (ppm).

#define DHT_PIN 4
#define DHT_TYPE DHT22
#define ANEMOMETER_PIN 27

// Completar después de identificar el anemómetro y calibrar su salida.
// No inventar este valor: determina la conversión de pulsos a km/h.
constexpr float KMH_POR_PULSO_POR_SEGUNDO = NAN;

DHT dht(DHT_PIN, DHT_TYPE);
volatile uint32_t pulsosViento = 0;
uint32_t ultimoEnvio = 0;
// Una lectura cada 5 minutos: 288 por día. La web muestra hasta 300 lecturas
// en "Últimas 24 horas"; enviar más seguido dejaría afuera las más viejas.
constexpr uint32_t INTERVALO_ENVIO_MS = 5UL * 60UL * 1000UL;

void IRAM_ATTR contarPulsoViento() {
  ++pulsosViento;
}

bool conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Conectando al Wi-Fi");
  const uint32_t inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 20000) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi conectado. IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }
  Serial.println("No se pudo conectar al Wi-Fi.");
  return false;
}

bool leerVientoKmh(float &vientoKmh) {
  // Cuenta pulsos durante el intervalo y aplica el factor del anemómetro.
  // Hasta completar la calibración, no enviamos una lectura inventada.
  if (!isfinite(KMH_POR_PULSO_POR_SEGUNDO) || KMH_POR_PULSO_POR_SEGUNDO <= 0) {
    noInterrupts();
    pulsosViento = 0;
    interrupts();
    Serial.println("Falta calibrar el anemómetro: no se enviará la lectura.");
    return false;
  }

  noInterrupts();
  const uint32_t pulsos = pulsosViento;
  pulsosViento = 0;
  interrupts();

  const float segundos = INTERVALO_ENVIO_MS / 1000.0f;
  vientoKmh = (pulsos / segundos) * KMH_POR_PULSO_POR_SEGUNDO;
  return isfinite(vientoKmh) && vientoKmh >= 0;
}

bool leerCOppm(float &coPpm) {
  // El MQ-7 suelto necesita su circuito de calefacción y calibración.
  // No convertir el ADC crudo a ppm sin esos datos.
  (void)coPpm;
  Serial.println("Falta definir circuito y calibración del MQ-7: no se enviará CO.");
  return false;
}

void agregarCampoJSON(char *cuerpo, size_t capacidad, bool &primero, const char *campo, float valor) {
  if (!isfinite(valor)) return;
  const size_t usados = strlen(cuerpo);
  snprintf(cuerpo + usados, capacidad - usados, "%s\"%s\":%.2f",
           primero ? "" : ",", campo, valor);
  primero = false;
}

bool enviarLectura(float temperatura, float humedad, float vientoKmh, float coPpm, float presion) {
  char cuerpo[192] = "{";
  bool primero = true;
  agregarCampoJSON(cuerpo, sizeof(cuerpo), primero, "temperatura", temperatura);
  agregarCampoJSON(cuerpo, sizeof(cuerpo), primero, "humedad", humedad);
  agregarCampoJSON(cuerpo, sizeof(cuerpo), primero, "velocidad_viento", vientoKmh);
  agregarCampoJSON(cuerpo, sizeof(cuerpo), primero, "co_concentracion", coPpm);
  agregarCampoJSON(cuerpo, sizeof(cuerpo), primero, "presion", presion);
  if (primero) {
    Serial.println("No hay ninguna medición disponible; no se envía un documento vacío.");
    return false;
  }
  strncat(cuerpo, "}", sizeof(cuerpo) - strlen(cuerpo) - 1);
  if (!conectarWiFi()) return false;

  WiFiClientSecure cliente;
  cliente.setCACert(ROOT_CA_CERT);

  HTTPClient http;
  if (!http.begin(cliente, API_URL)) {
    Serial.println("No se pudo iniciar la conexión HTTPS a la API.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY_SENSOR);

  const int codigo = http.POST(reinterpret_cast<uint8_t *>(cuerpo), strlen(cuerpo));
  const String respuesta = http.getString();
  http.end();

  Serial.printf("POST %s -> HTTP %d\n", API_URL, codigo);
  if (respuesta.length()) Serial.println(respuesta);
  return codigo == 201;
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(ANEMOMETER_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ANEMOMETER_PIN), contarPulsoViento, FALLING);
  conectarWiFi();
}

void loop() {
  if (millis() - ultimoEnvio < INTERVALO_ENVIO_MS) {
    delay(100);
    return;
  }
  ultimoEnvio = millis();

  const float temperatura = dht.readTemperature();
  const float humedad = dht.readHumidity();
  float vientoKmh = NAN;
  float coPpm = NAN;
  const float presion = NAN;  // Opcional; agregar lectura del BME280 cuando esté instalado.

  if (!isfinite(temperatura)) Serial.println("Temperatura del DHT22 no disponible; se omite ese campo.");
  if (!isfinite(humedad)) Serial.println("Humedad del DHT22 no disponible; se omite ese campo.");
  if (!leerVientoKmh(vientoKmh)) vientoKmh = NAN;
  if (!leerCOppm(coPpm)) coPpm = NAN;

  enviarLectura(temperatura, humedad, vientoKmh, coPpm, presion);
}
