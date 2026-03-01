'use client';
import { MainLayout } from '@/components/layout/main-layout';
import { UsersClient } from './users-client';
import { DbStatusChecker } from '@/components/account/db-status-checker';

export default function AccountPage() {
    return (
        <MainLayout>
            <div className="container mx-auto py-8 px-4">
                <h1 className="text-3xl font-bold mb-8 text-foreground">Configuración de la Aplicación</h1>
                
                <DbStatusChecker />

                <h2 className="text-2xl font-semibold mt-12 mb-6 text-foreground">Gestión de Usuarios</h2>
                <UsersClient />
            </div>
        </MainLayout>
    );
}
