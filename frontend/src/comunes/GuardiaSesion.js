'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';
import {
  LIMITE_INACTIVIDAD_MS,
  limpiarSesion,
  obtenerToken,
  registrarActividadSesion,
  sesionActivaPorActividad,
  tokenValido
} from '@/utilidades/sesion';

let cacheSesionActiva = false;

export function GuardiaSesion({ children }) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(cacheSesionActiva);
  const [cargando, setCargando] = useState(!cacheSesionActiva);

  const cerrarPorInactividad = () => {
    limpiarSesion();
    cacheSesionActiva = false;
    setAutorizado(false);
    router.replace('/iniciar-sesion?motivo=inactividad');
  };

  useEffect(() => {
    async function validarSesion() {
      const token = obtenerToken();
      const sesionActiva = sesionActivaPorActividad();
      if (!token || !tokenValido() || !sesionActiva) {
        const destino = token && !sesionActiva ? '/iniciar-sesion?motivo=inactividad' : '/iniciar-sesion';
        limpiarSesion();
        cacheSesionActiva = false;
        setCargando(false);
        setAutorizado(false);
        router.replace(destino);
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

  useEffect(() => {
    if (!autorizado) return undefined;

    let timeoutId;
    const eventosActividad = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

    const programarCierre = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(cerrarPorInactividad, LIMITE_INACTIVIDAD_MS);
    };

    const registrarActividad = () => {
      registrarActividadSesion();
      programarCierre();
    };

    eventosActividad.forEach((evento) => window.addEventListener(evento, registrarActividad, { passive: true }));
    programarCierre();

    return () => {
      window.clearTimeout(timeoutId);
      eventosActividad.forEach((evento) => window.removeEventListener(evento, registrarActividad));
    };
  }, [autorizado, router]);

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
