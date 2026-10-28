import supabase from './supabaseClient.js'

export async function insertarLecturaPrueba() {
  const { data, error } = await supabase
    .from('lecturas')
    .insert({ temperatura: 38.0, humedad: 25, viento: 70 })
    .select()

  console.log(error ?? data)
}