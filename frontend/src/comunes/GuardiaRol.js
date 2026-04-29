'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerUsuario } from '@/utilidades/sesion';
import { tieneAcceso } from '@/utilidades/roles';

export function GuardiaRol({ permitido, children }) {
  const router = useRouter();
  const usuario = obtenerUsuario();

  useEffect(() => {
    if (!tieneAcceso(usuario?.role, permitido)) {
      router.replace('/panel');
    }
  }, [permitido, router, usuario?.role]);

  if (!tieneAcceso(usuario?.role, permitido)) {
    return null;
  }

  return children;
}
