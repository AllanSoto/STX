
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET a single user by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const [rows] = await db.query(
        "SELECT id_usuario, nombre, apellido, correo, username, telefono, estado, id_rol, fecha_creacion, fecha_actualizacion, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE id_usuario = ?", 
        [id]
    );
    const users = rows as any[];
    if (users.length === 0) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }
    return NextResponse.json(users[0]);
  } catch (error) {
    console.error(`Error fetching user ${params.id}:`, error);
    return NextResponse.json({ message: "Error al obtener el usuario" }, { status: 500 });
  }
}

// PUT update a user by ID
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { nombre, apellido, correo, username, password, telefono, estado, id_rol } = await request.json();
    
    if (!nombre || !apellido || !correo || !username || !estado || !id_rol) {
      return NextResponse.json({ message: "Faltan campos requeridos" }, { status: 400 });
    }

    let query: string;
    let queryParams: any[];

    if (password) {
      // If a new password is provided, hash it
      const password_hash = await bcrypt.hash(password, 10);
      query = 'UPDATE usuarios SET nombre = ?, apellido = ?, correo = ?, username = ?, password_hash = ?, telefono = ?, estado = ?, id_rol = ? WHERE id_usuario = ?';
      queryParams = [nombre, apellido, correo, username, password_hash, telefono || null, estado, id_rol, id];
    } else {
      // If no new password, update other fields
      query = 'UPDATE usuarios SET nombre = ?, apellido = ?, correo = ?, username = ?, telefono = ?, estado = ?, id_rol = ? WHERE id_usuario = ?';
      queryParams = [nombre, apellido, correo, username, telefono || null, estado, id_rol, id];
    }
    
    const [result] = await db.execute(query, queryParams);
    const updateResult = result as any;

    if (updateResult.affectedRows === 0) {
        return NextResponse.json({ message: "Usuario no encontrado o sin cambios" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Usuario actualizado correctamente" });

  } catch (error: any) {
    console.error(`Error updating user ${params.id}:`, error);
    if (error.code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ message: 'El correo electrónico o el nombre de usuario ya existen.' }, { status: 409 });
    }
    return NextResponse.json({ message: "Error al actualizar el usuario" }, { status: 500 });
  }
}

// DELETE a user by ID
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const [result] = await db.execute('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
    const deleteResult = result as any;

    if (deleteResult.affectedRows === 0) {
        return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    return new Response(null, { status: 204 }); // Success, no content
  } catch (error) {
    console.error(`Error deleting user ${params.id}:`, error);
    return NextResponse.json({ message: "Error al eliminar el usuario" }, { status: 500 });
  }
}
