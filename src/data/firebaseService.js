import {
    collection, query, orderBy, limit, where,
    getDocs, onSnapshot, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

// Convierte un documento de Firestore en un objeto normal de JavaScript
const convertir = (doc) => {
    const d = doc.data()
    return { ...d, timestamp: d.timestamp.toDate() }
}

export async function getLecturaActual() {
    const q = query(collection(db, 'lecturas'), orderBy('timestamp', 'desc'), limit(5))
    const snap = await getDocs(q)

    if (snap.empty) {
        console.log('No hay lecturas todavía')
    } else {
        const lecturas = snap.docs.map((doc) => {
            const d = doc.data()
            return { ...d, timestamp: d.timestamp.toDate() }
        })

        console.log(`Se trajeron ${lecturas.length} lecturas`)
        console.table(lecturas)
    }

    process.exit(0)
}
// obtener el historial
export async function getLecturaActual() {
    const q = query(collection(db, 'umbrales'), orderBy('timestamp', 'desc'), limit(4))
    const snap = await getDocs(q)

    if (snap.empty) {
        console.log('No hay umbrales')
    } else {
        const umbrales = snap.docs.map((doc) => {
            const d = doc.data()
            return { ...d, timestamp: d.timestamp.toDate() }
        })

        console.log(`Se trajeron ${umbrales.length} umbrales`)
        console.table(umbrales)
    }

    process.exit(0)
}


// obtener las alertas
export async function getLecturaActual() {
    const q = query(collection(db, 'alertas'), orderBy('timestamp', 'desc'), limit(5))
    const snap = await getDocs(q)

    if (snap.empty) {
        console.log('No hay lecturas todavía')
    } else {
        const lecturas = snap.docs.map((doc) => {
            const d = doc.data()
            return { ...d, timestamp: d.timestamp.toDate() }
        })

        console.log(`Se trajeron ${lecturas.length} lecturas`)
        console.table(lecturas)
    }

    process.exit(0)
}
