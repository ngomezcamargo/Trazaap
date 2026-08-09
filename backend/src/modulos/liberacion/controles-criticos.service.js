const MARGENES = {
  tiempo_fermentacion: { porcentaje: 0.1, minimoAbsoluto: 3 },
  temperatura_fermentacion: { absoluto: 3 },
  tiempo_horneado: { porcentaje: 0.1, minimoAbsoluto: 2 },
  temperatura_horneado: { absoluto: 8 },
  tiempo_inmersion: { porcentaje: 0.15, minimoAbsoluto: 1 },
  temperatura_inmersion: { absoluto: 5 }
};

function numero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function crearControl(variable, etiqueta, value, expected, margen) {
  const valor = numero(value);
  const esperado = numero(expected);
  if (valor == null || esperado == null || esperado <= 0) return null;

  const tolerancia = margen.absoluto ?? Math.max(
    esperado * margen.porcentaje,
    margen.minimoAbsoluto
  );
  const minimo = Number(Math.max(0, esperado - tolerancia).toFixed(2));
  const maximo = Number((esperado + tolerancia).toFixed(2));
  return {
    variable,
    etiqueta,
    valor,
    esperado,
    minimo,
    maximo,
    cumple: valor >= minimo && valor <= maximo
  };
}

function controlBinario(variable, etiqueta, cumple) {
  return {
    variable,
    etiqueta,
    valor: cumple ? 1 : 0,
    minimo: 1,
    maximo: 1,
    cumple: Boolean(cumple)
  };
}

export function construirControlesCriticos(manufactura, liberacion) {
  const controles = [
    crearControl(
      'tiempo_fermentacion_minutos',
      'Tiempo de fermentacion',
      manufactura.tiempo_real_fermentacion_minutos,
      manufactura.tiempo_fermentacion_minutos,
      MARGENES.tiempo_fermentacion
    ),
    crearControl(
      'temperatura_fermentacion_c',
      'Temperatura de fermentacion',
      manufactura.temperatura_real_fermentacion_c,
      manufactura.temperatura_fermentacion_c,
      MARGENES.temperatura_fermentacion
    ),
    crearControl(
      'tiempo_horneado_minutos',
      'Tiempo de horneado',
      manufactura.tiempo_real_horneado_minutos,
      manufactura.tiempo_horneado_minutos,
      MARGENES.tiempo_horneado
    ),
    crearControl(
      'temperatura_horneado_c',
      'Temperatura de horneado',
      manufactura.temperatura_real_horneado_c,
      manufactura.temperatura_horneado_c,
      MARGENES.temperatura_horneado
    )
  ];

  if (manufactura.requiere_inmersion) {
    controles.push(
      crearControl(
        'tiempo_inmersion_minutos',
        'Tiempo de inmersion',
        manufactura.tiempo_real_inmersion_minutos,
        manufactura.tiempo_inmersion_minutos,
        MARGENES.tiempo_inmersion
      ),
      crearControl(
        'temperatura_inmersion_c',
        'Temperatura de inmersion',
        manufactura.temperatura_real_inmersion_c,
        manufactura.temperatura_inmersion_c,
        MARGENES.temperatura_inmersion
      )
    );
  }

  controles.push(
    controlBinario('etiqueta_verificada', 'Etiqueta verificada', liberacion.etiqueta_verificada),
    controlBinario('verificacion_envase', 'Envase verificado', liberacion.verificacion_envase),
    controlBinario('lote_visible', 'Lote visible', true),
    controlBinario('fecha_vencimiento_visible', 'Fecha de vencimiento visible', true),
    controlBinario('empaque_conforme', 'Empaque conforme', liberacion.verificacion_envase),
    controlBinario('producto_en_buen_estado', 'Producto en buen estado', true),
    controlBinario('limpieza_vehiculo', 'Limpieza del vehiculo', liberacion.limpieza_vehiculo === 'cumple'),
    controlBinario('documentacion_conductor', 'Documentacion y dotacion del conductor', liberacion.documentacion_dotacion === 'cumple')
  );

  return controles.filter(Boolean);
}

export { MARGENES };
