
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET all users
export async function GET() {
  try {
    // Avoid selecting password hash
    const [rows] = await db.query("SELECT id_usuario, nombre, apellido, correo, username, telefono, estado, id_rol, fecha_creacion, fecha_actualizacion, intentos_fallidos, bloqueado_hasta FROM usuarios ORDER BY fecha_creacion DESC");
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ message: "Error al obtener usuarios" }, { status: 500 });
  }
}

// POST a new user
export async function POST(request: Request) {
  try {
    const { nombre, apellido, correo, username, password, telefono, estado, id_rol } = await request.json();

    if (!nombre || !apellido || !correo || !username || !password || !estado || !id_rol) {
      return NextResponse.json({ message: "Faltan campos requeridos" }, { status: 400 });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      'INSERT INTO usuarios (nombre, apellido, correo, username, password_hash, telefono, estado, id_rol, intentos_fallidos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
      [nombre, apellido, correo, username, password_hash, telefono || null, estado, id_rol]
    );

    const insertResult = result as any;

    if (insertResult.insertId) {
        const [rows] = await db.query('SELECT id_usuario, nombre, apellido, correo, username, telefono, estado, id_rol, fecha_creacion FROM usuarios WHERE id_usuario = ?', [insertResult.insertId]);
        const newUsers = rows as any[];
        if(newUsers.length > 0) {
            return NextResponse.json(newUsers[0], { status: 201 });
        }
    }
    
    return NextResponse.json({ message: "No se pudo crear el usuario" }, { status: 500 });

  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ message: 'El correo electrónico o el nombre de usuario ya existen.' }, { status: 409 });
    }
    return NextResponse.json({ message: "Error al crear el usuario" }, { status: 500 });
  }
}
