import { poolPostgres } from '../../../configuracion/postgresql.js';
import { booleano, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadProductoFabricado(idProducto) {
  const [productoRes, variantesRes] = await Promise.all([
    poolPostgres.query('SELECT * FROM productos_fabricados WHERE id = $1', [idProducto]),
    poolPostgres.query(
      `SELECT *
       FROM producto_variantes
       WHERE producto_id = $1
       ORDER BY id`,
      [idProducto]
    )
  ]);

  const producto = productoRes.rows[0];
  if (!producto) return null;

  const variantes = await Promise.all(
    variantesRes.rows.map(async (variante) => {
      const { rows } = await poolPostgres.query(
        `SELECT pvmp.*, rm.nombre AS materia_prima_nombre, rm.unidad_medida_base
         FROM producto_variante_materia_prima pvmp
         JOIN raw_materials rm ON rm.id = pvmp.materia_prima_id
         WHERE pvmp.variante_id = $1
         ORDER BY rm.nombre`,
        [variante.id]
      );

      return {
        nombre_variante: texto(variante.nombre_variante || variante.tamano_presentacion),
        tamano_presentacion: texto(variante.tamano_presentacion),
        peso_estimado_unidad: numero(variante.peso_estimado_unidad),
        unidad_medida: texto(variante.unidad_medida),
        estado: texto(variante.estado),
        materias_primas: rows.map((materia) => ({
          materia_prima: texto(materia.materia_prima_nombre),
          cantidad_requerida: numero(materia.cantidad_requerida),
          unidad_medida_base: texto(materia.unidad_medida_base),
          observaciones: texto(materia.observaciones)
        }))
      };
    })
  );

  const payload = {
    tipoEvento: 'producto_fabricado_configurado',
    producto: {
      nombre: texto(producto.nombre),
      prefijo_lote: texto(producto.prefijo_lote),
      categoria: texto(producto.categoria),
      descripcion: texto(producto.descripcion),
      tamano_presentacion: texto(producto.tamano_presentacion),
      vida_util_dias: numero(producto.vida_util_dias),
      condiciones_almacenamiento: texto(producto.condiciones_almacenamiento),
      temperatura_almacenamiento_min_c: numero(producto.temperatura_almacenamiento_min_c),
      temperatura_almacenamiento_max_c: numero(producto.temperatura_almacenamiento_max_c),
      requiere_refrigeracion: booleano(producto.requiere_refrigeracion),
      estado: texto(producto.estado),
      requiere_inmersion: booleano(producto.requiere_inmersion),
      tiempo_fermentacion_minutos: numero(producto.tiempo_fermentacion_minutos),
      temperatura_fermentacion_c: numero(producto.temperatura_fermentacion_c),
      tiempo_horneado_minutos: numero(producto.tiempo_horneado_minutos),
      temperatura_horneado_c: numero(producto.temperatura_horneado_c),
      tiempo_inmersion_minutos: numero(producto.tiempo_inmersion_minutos),
      temperatura_inmersion_c: numero(producto.temperatura_inmersion_c),
      variantes
    }
  };

  return {
    tipoEvento: 'producto_fabricado_configurado',
    idEntidad: idProducto,
    lote: texto(producto.nombre),
    actor: 'sistema',
    fechaEvento: new Date().toISOString(),
    payload: ordenarValor(payload)
  };
}
