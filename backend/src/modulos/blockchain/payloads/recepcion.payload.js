import { poolPostgres } from '../../../configuracion/postgresql.js';
import { fechaISO, fechaSimple, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadRecepcion(idRecepcion) {
  const { rows } = await poolPostgres.query(
    `SELECT
       r.fecha_recepcion,
       r.cantidad,
       r.unidad_presentacion,
       r.lote_proveedor,
       r.numero_lote,
       r.fecha_vencimiento,
       r.temperatura_recepcion,
       r.peso_recibido,
       r.unidad_medida,
       r.presentacion,
       r.observaciones,
       r.recibido_por,
       r.estado_recepcion,
       p.nombre AS proveedor_nombre,
       p.nit AS proveedor_nit,
       p.contacto AS proveedor_contacto,
       p.telefono AS proveedor_telefono,
       p.email AS proveedor_email,
       p.direccion AS proveedor_direccion,
       p.nombre_contacto AS proveedor_nombre_contacto,
       p.certificaciones AS proveedor_certificaciones,
       rm.nombre AS materia_prima_nombre,
       rm.descripcion AS materia_prima_descripcion,
       rm.unidad_medida AS materia_prima_unidad_medida,
       rm.unidad_medida_base,
       rm.tipo_insumo,
       rm.condiciones_almacenamiento
     FROM receptions r
     JOIN providers p ON p.id = r.proveedor_id
     JOIN raw_materials rm ON rm.id = r.materia_prima_id
     WHERE r.id = $1`,
    [idRecepcion]
  );

  const row = rows[0];
  if (!row) return null;

  const payload = {
    tipoEvento: 'recepcion_materia_prima',
    recepcion: {
      fecha_recepcion: fechaISO(row.fecha_recepcion),
      proveedor: {
        nombre: texto(row.proveedor_nombre),
        nit: texto(row.proveedor_nit),
        contacto: texto(row.proveedor_contacto),
        telefono: texto(row.proveedor_telefono),
        email: texto(row.proveedor_email),
        direccion: texto(row.proveedor_direccion),
        nombre_contacto: texto(row.proveedor_nombre_contacto),
        certificaciones: texto(row.proveedor_certificaciones)
      },
      materia_prima: {
        nombre: texto(row.materia_prima_nombre),
        descripcion: texto(row.materia_prima_descripcion),
        unidad_medida: texto(row.materia_prima_unidad_medida),
        unidad_medida_base: texto(row.unidad_medida_base),
        tipo_insumo: texto(row.tipo_insumo),
        condiciones_almacenamiento: texto(row.condiciones_almacenamiento)
      },
      cantidad: numero(row.cantidad),
      unidad_presentacion: texto(row.unidad_presentacion),
      lote_proveedor: texto(row.lote_proveedor),
      numero_lote: texto(row.numero_lote),
      fecha_vencimiento: fechaSimple(row.fecha_vencimiento),
      temperatura_recepcion: numero(row.temperatura_recepcion),
      peso_recibido: numero(row.peso_recibido),
      unidad_medida: texto(row.unidad_medida),
      presentacion: texto(row.presentacion),
      observaciones: texto(row.observaciones),
      recibido_por: texto(row.recibido_por),
      estado_recepcion: texto(row.estado_recepcion)
    }
  };

  return {
    tipoEvento: 'recepcion_materia_prima',
    idEntidad: idRecepcion,
    lote: texto(row.numero_lote || row.lote_proveedor),
    actor: texto(row.recibido_por || 'sistema'),
    fechaEvento: fechaISO(row.fecha_recepcion),
    payload: ordenarValor(payload)
  };
}
