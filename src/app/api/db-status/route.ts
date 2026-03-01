import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // A simple query to check if the connection is alive
    await db.query('SELECT 1');
    return NextResponse.json({ message: 'La conexión a la base de datos se ha establecido correctamente.' });
  } catch (error: any) {
    console.error("Database connection error:", error);
    
    let userMessage = 'Error desconocido al conectar con la base de datos.';

    // Provide more specific, user-friendly messages for common errors
    if (error.code === 'ETIMEDOUT') {
        userMessage = 'El tiempo de espera para la conexión ha expirado (ETIMEDOUT). Esto puede suceder si el servidor de la base de datos está tardando demasiado en responder, si la dirección IP es incorrecta o si un firewall está bloqueando la conexión.';
    } else if (error.code === 'ECONNREFUSED') {
        userMessage = 'La conexión fue rechazada (ECONNREFUSED). Asegúrate de que el servidor de la base de datos esté en ejecución y que la dirección y el puerto sean correctos.';
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        userMessage = 'Acceso denegado (ER_ACCESS_DENIED_ERROR). Verifica que el usuario y la contraseña de la base de datos sean correctos.';
    } else if (error.code === 'ER_BAD_DB_ERROR') {
        userMessage = `La base de datos '${process.env.DB_DATABASE}' no existe (ER_BAD_DB_ERROR).`;
    } else if (error.message) {
        userMessage = error.message;
    }

    return NextResponse.json(
      { message: `Error de conexión: ${userMessage}` },
      { status: 500 }
    );
  }
}
