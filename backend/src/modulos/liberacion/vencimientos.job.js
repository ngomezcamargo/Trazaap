import { procesarAlertasVencimientoService } from './liberacion.service.js';

let timer = null;

export function iniciarTareaAlertasVencimiento({
  intervaloMs = 60 * 60 * 1000,
  ejecutar = procesarAlertasVencimientoService
} = {}) {
  if (timer) return timer;

  const revisar = async () => {
    try {
      await ejecutar();
    } catch (error) {
      console.error(`[Vencimientos] La revision programada fallo: ${error.message}`);
    }
  };

  setTimeout(revisar, 10_000).unref();
  timer = setInterval(revisar, intervaloMs);
  timer.unref();
  return timer;
}

export function detenerTareaAlertasVencimiento() {
  if (timer) clearInterval(timer);
  timer = null;
}
