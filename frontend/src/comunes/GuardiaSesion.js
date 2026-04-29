'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';
import { limpiarSesion, obtenerToken, tokenValido } from '@/utilidades/sesion';

export function GuardiaSesion({ children }) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function validarSesion() {
      const token = obtenerToken();
      if (!token || !tokenValido()) {
        limpiarSesion();
        setCargando(false);
        setAutorizado(false);
        router.replace('/iniciar-sesion');
        return;
      }

      try {
        await autenticacionServicio.perfil();
        setAutorizado(true);
      } catch {
        limpiarSesion();
        setAutorizado(false);
        router.replace('/iniciar-sesion');
      } finally {
        setCargando(false);
      }
    }

    validarSesion();
  }, [router]);

  if (cargando) {
    return null;
  }

  if (!autorizado) {
    if (obtenerToken()) {
      limpiarSesion();
    }
      router.replace('/iniciar-sesion');
    return null;
  }

  return children;
}
