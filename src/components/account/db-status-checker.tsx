'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Server, ServerCrash, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function DbStatusChecker() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const checkDbStatus = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/db-status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ocurrió un error desconocido.');
      }

      setStatus('success');
      setMessage(data.message);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <Card className="mb-8 shadow-lg">
      <CardHeader>
        <CardTitle>Estado de la Conexión a la Base de Datos</CardTitle>
        <CardDescription>
          Haz clic en el botón para verificar si la aplicación puede conectar con la base de datos MySQL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button onClick={checkDbStatus} disabled={status === 'loading'}>
            {status === 'loading' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Server className="mr-2 h-4 w-4" />
            )}
            Verificar Conexión
          </Button>
          {status !== 'idle' && (
             <div className="flex items-center gap-2 mt-4 sm:mt-0 p-3 rounded-md bg-muted/50 w-full">
                {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {status === 'error' && <ServerCrash className="h-5 w-5 text-destructive" />}
                <div className='flex flex-col'>
                     <Badge 
                        variant={
                            status === 'success' ? 'default' :
                            status === 'error' ? 'destructive' :
                            'secondary'
                        }
                        className={cn(
                            'w-fit',
                            status === 'success' && 'bg-green-500 hover:bg-green-600',
                        )}
                     >
                        {status === 'loading' && 'Verificando...'}
                        {status === 'success' && 'Éxito'}
                        {status === 'error' && 'Error'}
                    </Badge>
                    <p className={cn(
                        "text-sm mt-1",
                        status === 'success' && 'text-green-700 dark:text-green-400',
                        status === 'error' && 'text-destructive',
                        status === 'loading' && 'text-muted-foreground'
                    )}>
                        {status === 'loading' ? 'Intentando conectar a la base de datos...' : message}
                    </p>
                </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
