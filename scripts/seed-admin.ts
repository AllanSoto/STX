
import db from '../src/lib/db';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Carga las variables de entorno del archivo .env
dotenv.config();

async function seedAdmin() {
  console.log('Iniciando la creación del usuario administrador...');

  // Verifica si las variables de entorno de la base de datos están configuradas
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_DATABASE) {
      console.error('Error: Las variables de entorno de la base de datos no están configuradas.');
      console.error('Por favor, asegúrate de que DB_HOST, DB_USER, DB_PASSWORD y DB_DATABASE estén en tu archivo .env.');
      process.exit(1);
  }
  
  const adminUsername = 'CEO';
  const adminPassword = 'Alamaster23!';
  const adminEmail = 'ceo@simultradex.com';

  try {
    const connection = await db.getConnection();
    console.log('Conectado a la base de datos exitosamente.');

    // Comprueba si el usuario ya existe
    const [existingUsers] = await connection.query(
      'SELECT id_usuario FROM usuarios WHERE username = ? OR correo = ?',
      [adminUsername, adminEmail]
    );

    const users = existingUsers as any[];

    if (users.length > 0) {
      console.log('El usuario administrador "CEO" ya existe. Omitiendo creación.');
      connection.release();
      await db.end();
      return;
    }

    // Hashea la contraseña
    const password_hash = await bcrypt.hash(adminPassword, 10);
    console.log('Contraseña hasheada.');

    // Inserta el nuevo usuario administrador
    const [result] = await connection.execute(
      `INSERT INTO usuarios 
        (nombre, apellido, correo, username, password_hash, estado, id_rol, intentos_fallidos) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['CEO', 'User', adminEmail, adminUsername, password_hash, 'activo', 1, 0]
    );

    const insertResult = result as any;

    if (insertResult.insertId) {
      console.log(`Superusuario "CEO" creado exitosamente con el ID: ${insertResult.insertId}`);
    } else {
      throw new Error('No se pudo insertar el usuario administrador.');
    }

    connection.release();
  } catch (error: any) {
    console.error('Error al crear el usuario administrador:', error.message);
    if(error.code) {
        console.error(`Código de error de la base de datos: ${error.code}`);
    }
  } finally {
    // Cierra el pool de conexiones
    await db.end();
    console.log('Pool de la base de datos cerrado.');
  }
}

seedAdmin();
