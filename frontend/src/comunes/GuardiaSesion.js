'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerToken } from '@/utilidades/sesion';

export function GuardiaSesion({ children }) {
  const router = useRouter();

  useEffect(() => {
    if (!obtenerToken()) {
      router.replace('/iniciar-sesion');
    }
  }, [router]);

  if (!obtenerToken()) {
    return null;
  }

  return children;
}
