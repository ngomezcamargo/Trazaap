import { poolPostgres } from '../../../configuracion/postgresql.js';
import { fechaISO, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadOrdenProduccion(idOrden) {
  const [ordenRes, productosRes, materiasRes] = await Promise.all([
    poolPostgres.query(
      `SELECT op.*, creador.email AS creado_por_email, responsable.email AS responsable_email
       FROM ordenes_produccion op
       LEFT JOIN users creador ON creador.id = op.creado_por
       LEFT JOIN users responsable ON responsable.id = op.responsable_produccion
       WHERE op.id = $1`,
      [idOrden]
    ),
    poolPostgres.query(
      `SELECT *
       FROM ordenes_produccion_productos
       WHERE orden_produccion_id = $1
       ORDER BY id`,
      [idOrden]
    ),
    poolPostgres.query(
      `SELECT *
       FROM ordenes_produccion_materias
       WHERE orden_produccion_id = $1
       ORDER BY orden_producto_id, id`,
      [idOrden]
    )
  ]);

  const orden = ordenRes.rows[0];
  if (!orden) return null;

  const materiasPorProducto = materiasRes.rows.reduce((acc, materia) => {
    const key = String(materia.orden_producto_id || '');
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push({
      nombre_ingrediente: texto(materia.nombre_ingrediente),
      cantidad_planificada: numero(materia.cantidad_planificada),
      cantidad_real: numero(materia.cantidad_real),
      unidad_medida: texto(materia.unidad_medida),
      diferencia: numero(materia.diferencia),
      observaciones: texto(materia.observaciones)
    });
    return acc;
  }, new Map());

  const payload = {
    tipoEvento: 'orden_produccion',
    orden: {
      fecha_produccion: fechaISO(orden.fecha_produccion),
      codigo_orden: texto(orden.codigo_orden),
      responsable_produccion: texto(orden.responsable_email),
      estado: texto(orden.estado),
      observaciones: texto(orden.observaciones),
      creado_por: texto(orden.creado_por_email || orden.creado_por),
      productos: productosRes.rows.map((producto) => ({
        producto: texto(producto.producto),
        tamano_presentacion: texto(producto.tamano_presentacion),
        cantidad_programada: numero(producto.cantidad_programada),
        estado_manufactura: texto(producto.estado_manufactura),
        observaciones: texto(producto.observaciones),
        materias_primas_planificadas: materiasPorProducto.get(String(producto.id)) || []
      }))
    }
  };

  return {
    tipoEvento: 'orden_produccion',
    idEntidad: idOrden,
    lote: texto(orden.codigo_orden),
    actor: texto(orden.creado_por_email || orden.creado_por || 'sistema'),
    fechaEvento: fechaISO(orden.fecha_produccion),
    payload: ordenarValor(payload)
  };
}
