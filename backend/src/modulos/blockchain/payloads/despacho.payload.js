import { poolPostgres } from '../../../configuracion/postgresql.js';
import { generarCodigoClienteDespacho } from '../../publico/codigos-acceso.util.js';
import { construirControlesCriticos } from '../../liberacion/controles-criticos.service.js';
import { booleano, fechaISO, fechaSimple, numero, ordenarValor, texto } from './helpers.js';

export async function construirPayloadDespacho(idDespacho) {
  const cabeceraRes = await poolPostgres.query(
    `SELECT d.*, c.nombre_razon_social, c.nit_documento, c.nombre_contacto,
            c.telefono, c.email AS cliente_email, c.direccion,
            u.email AS responsable_despacho_email
     FROM despachos d
     LEFT JOIN clientes c ON c.id_cliente = d.id_cliente
     JOIN users u ON u.id = d.responsable_despacho
     WHERE d.id_despacho = $1`,
    [idDespacho]
  );
  const despacho = cabeceraRes.rows[0];
  if (!despacho) return null;

  const detallesRes = await poolPostgres.query(
    `SELECT
       dd.*,
       ipt.producto,
       ipt.lote,
       ipt.fecha_vencimiento,
       lp.estado_liberacion,
       lp.etiqueta_verificada,
       lp.verificacion_envase,
       lp.lote_visible,
       lp.fecha_vencimiento_visible,
       lp.empaque_conforme,
       lp.producto_en_buen_estado,
       lp.id_manufactura,
       al.id_almacenamiento,
       al.estado AS estado_almacenamiento,
       al.temperatura_min_esperada_c,
       al.temperatura_max_esperada_c,
       al.temperatura_salida_c AS temperatura_salida_almacenamiento_c,
       rm.tiempo_real_fermentacion_minutos,
       rm.temperatura_real_fermentacion_c,
       rm.tiempo_real_horneado_minutos,
       rm.temperatura_real_horneado_c,
       rm.tiempo_real_inmersion_minutos,
       rm.temperatura_real_inmersion_c,
       pf.requiere_inmersion,
       pf.tiempo_fermentacion_minutos,
       pf.temperatura_fermentacion_c,
       pf.tiempo_horneado_minutos,
       pf.temperatura_horneado_c,
       pf.tiempo_inmersion_minutos,
       pf.temperatura_inmersion_c
     FROM despacho_detalle dd
     JOIN inventario_producto_terminado ipt ON ipt.id_inventario = dd.id_inventario_producto_terminado
     JOIN liberacion_producto lp ON lp.id_liberacion = dd.id_liberacion
     JOIN registro_manufactura rm ON rm.id_manufactura = lp.id_manufactura
     JOIN ordenes_produccion_productos opp ON opp.id = lp.id_producto
     LEFT JOIN productos_fabricados pf ON pf.id = opp.producto_fabricado_id
     LEFT JOIN almacenamientos_lote al ON al.id_manufactura = lp.id_manufactura
     WHERE dd.id_despacho = $1
     ORDER BY dd.id_detalle`,
    [idDespacho]
  );

  const codigoCliente = generarCodigoClienteDespacho(despacho);
  const detalles = detallesRes.rows.map((row) => ordenarValor({
    idInventario: String(row.id_inventario_producto_terminado),
    idLiberacion: String(row.id_liberacion),
    idManufactura: String(row.id_manufactura),
    lote: texto(row.lote),
    producto: texto(row.producto),
    cantidadDespachada: numero(row.cantidad_despachada),
    fechaVencimiento: fechaSimple(row.fecha_vencimiento),
    estadoLiberacion: texto(row.estado_liberacion),
    temperaturaMinEsperadaC: numero(row.temperatura_min_esperada_c),
    temperaturaMaxEsperadaC: numero(row.temperatura_max_esperada_c),
    almacenamiento: {
      idAlmacenamiento: String(row.id_almacenamiento || ''),
      estado: texto(row.estado_almacenamiento),
      temperaturaSalidaC: numero(row.temperatura_salida_almacenamiento_c)
    },
    validaciones: {
      etiquetaVerificada: booleano(row.etiqueta_verificada),
      verificacionEnvase: booleano(row.verificacion_envase),
      loteVisible: booleano(row.lote_visible),
      fechaVencimientoVisible: booleano(row.fecha_vencimiento_visible),
      empaqueConforme: booleano(row.empaque_conforme),
      productoBuenEstado: booleano(row.producto_en_buen_estado)
    },
    controlesCriticos: construirControlesCriticos(row, row)
      .filter((control) => !['limpieza_vehiculo', 'documentacion_conductor'].includes(control.variable))
  }));

  return ordenarValor({
    idEntidad: String(despacho.id_despacho),
    codigoDespacho: texto(despacho.codigo_despacho),
    numeroFactura: texto(despacho.numero_factura),
    codigoCliente,
    cliente: {
      nombre: texto(despacho.nombre_razon_social),
      documento: texto(despacho.nit_documento),
      contacto: texto(despacho.nombre_contacto),
      telefono: texto(despacho.telefono),
      email: texto(despacho.cliente_email),
      direccion: texto(despacho.direccion)
    },
    fechaEvento: fechaISO(despacho.fecha_despacho),
    actor: texto(despacho.responsable_despacho_email),
    responsableDespacho: texto(despacho.responsable_despacho_email),
    temperaturaSalidaC: numero(despacho.temperatura_salida_c),
    transporte: {
      conductor: texto(despacho.conductor),
      placaVehiculo: texto(despacho.placa_vehiculo),
      temperaturaTransporteC: numero(despacho.temperatura_transporte_c),
      limpiezaVehiculo: texto(despacho.limpieza_vehiculo),
      documentacionConductor: texto(despacho.documentacion_dotacion),
      canalDistribucion: texto(despacho.canal_distribucion)
    },
    observaciones: texto(despacho.observaciones),
    detalles
  });
}
