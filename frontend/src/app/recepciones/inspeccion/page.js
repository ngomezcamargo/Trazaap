'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InspeccionRecepcionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/recepciones/nueva');
  }, [router]);

  return null;
}
