
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Usuario } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ColumnsProps {
    onEdit: (user: Usuario) => void;
    onDelete: (user: Usuario) => void;
}

export const columns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Usuario>[] => [
  {
    accessorKey: 'nombre',
    header: 'Nombre completo',
    cell: ({ row }) => {
        const user = row.original;
        return <div className="font-medium">{user.nombre} {user.apellido}</div>
    }
  },
  {
    accessorKey: 'correo',
    header: 'Correo Electrónico',
  },
  {
    accessorKey: 'username',
    header: 'Username',
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => {
        const estado = row.getValue('estado') as string;
        return (
            <Badge 
              variant={
                estado === 'activo' ? 'default' : 
                estado === 'inactivo' ? 'secondary' : 'destructive'
              }
              className={cn(estado === 'activo' && 'bg-green-500 hover:bg-green-600')}
            >
                {estado.charAt(0).toUpperCase() + estado.slice(1)}
            </Badge>
        )
    }
  },
   {
    accessorKey: 'fecha_creacion',
    header: 'Fecha de Creación',
    cell: ({ row }) => {
        const date = new Date(row.getValue('fecha_creacion'));
        return format(date, "d 'de' MMMM, yyyy", { locale: es });
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(user)}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
