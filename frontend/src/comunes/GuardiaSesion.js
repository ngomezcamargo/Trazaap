'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';
import { limpiarSesion, obtenerToken, tokenValido } from '@/utilidades/sesion';

let cacheSesionActiva = false;

export function GuardiaSesion({ children }) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(cacheSesionActiva);
  const [cargando, setCargando] = useState(!cacheSesionActiva);

  useEffect(() => {
    async function validarSesion() {
      const token = obtenerToken();
      if (!token || !tokenValido()) {
        limpiarSesion();
        cacheSesionActiva = false;
        setCargando(false);
        setAutorizado(false);
        router.replace('/iniciar-sesion');
        return;
      }

      cacheSesionActiva = true;
      setAutorizado(true);
      setCargando(false);

      const ultimaValidacion = Number(sessionStorage.getItem('trazaap_sesion_check') || 0);
      const ahora = Date.now();
      if (ahora - ultimaValidacion < 5 * 60 * 1000) {
        return;
      }

      try {
        await autenticacionServicio.perfil();
        sessionStorage.setItem('trazaap_sesion_check', String(ahora));
        cacheSesionActiva = true;
        setAutorizado(true);
      } catch {
        limpiarSesion();
        cacheSesionActiva = false;
        setAutorizado(false);
        router.replace('/iniciar-sesion');
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
    cacheSesionActiva = false;
    return null;
  }

  return children;
}
