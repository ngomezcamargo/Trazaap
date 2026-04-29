'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerToken } from '@/utilidades/sesion';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (obtenerToken()) {
      router.replace('/panel');
      return;
    }
    router.replace('/iniciar-sesion');
  }, [router]);

  return null;
}
