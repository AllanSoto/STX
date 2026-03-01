import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // A simple query to check if the connection is alive
    await db.query('SELECT 1');
    return NextResponse.json({ message: 'La conexión a la base de datos se ha establecido correctamente.' });
  } catch (error: any) {
    console.error("Database connection error:", error);
    // Return a more specific error message if possible
    const errorMessage = error.message || 'Error desconocido al conectar con la base de datos.';
    return NextResponse.json(
      { message: `Error de conexión: ${errorMessage}` },
      { status: 500 }
    );
  }
}
