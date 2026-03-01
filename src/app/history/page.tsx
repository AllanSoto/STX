import type { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Historial de Órdenes - SimulTradex',
};

export default function HistoryPage() {
  return (
    <MainLayout>
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8 text-foreground">Historial de Órdenes</h1>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Función No Disponible</CardTitle>
                    <CardDescription>
                        El historial de órdenes ya no está disponible. Esta funcionalidad dependía de una conexión a Firebase, que ha sido eliminada del proyecto.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    </MainLayout>
  );
}
