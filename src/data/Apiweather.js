// weatherApi.js — Capa de datos externa

const API_KEY = '074f4e3a7bf8eb9439eccc6ae57e395b'
const LAT = -31.4135 
const LON = -64.1811

export async function getLecturaActual() {
    const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${API_KEY}`
)
const data = await res.json()

return {
    temperatura:  data.main.temp,
    humedad:      data.main.humidity,
    presion:      data.main.pressure,
    luminosidad:  null,
    timestamp:    new Date(data.dt * 1000),
}
}