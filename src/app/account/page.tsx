
'use client';
import { MainLayout } from '@/components/layout/main-layout';
import { UsersClient } from './users-client';

export default function AccountPage() {
    return (
        <MainLayout>
            <div className="container mx-auto py-8 px-4">
                <h1 className="text-3xl font-bold mb-8 text-foreground">Gestión de Usuarios</h1>
                <UsersClient />
            </div>
        </MainLayout>
    );
}
