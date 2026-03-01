# SimulTradex

This is a Next.js application for simulating cryptocurrency trading.

## Features

- Live cryptocurrency price tracking.
- Order and opportunity simulator.
- User management via a MySQL database.

## Environment Setup

This application requires a MySQL database connection.

1.  **Create a `.env.local` file:** In the root of your project, create a file named `.env.local`.
2.  **Add Environment Variables:** Add your MySQL database credentials to the `.env.local` file.

    ```env
    DB_HOST=YOUR_DATABASE_HOST
    DB_PORT=YOUR_DATABASE_PORT
    DB_USER=YOUR_DATABASE_USER
    DB_PASSWORD=YOUR_DATABASE_PASSWORD
    DB_DATABASE=YOUR_DATABASE_NAME
    ```

3.  **Restart your development server:** After creating or modifying the `.env.local` file, you **must** restart your Next.js development server for the changes to take effect.
