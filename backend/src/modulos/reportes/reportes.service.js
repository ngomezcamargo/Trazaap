import ExcelJS from 'exceljs';
import { consultarTrazabilidadPorLote } from '../trazabilidad/trazabilidad.service.js';

async function consultarLotes(lotes) {
  const resultados = [];
  for (let i = 0; i < lotes.length; i += 5) {
    const grupo = await Promise.all(lotes.slice(i, i + 5).map(async (lote) => {
      try {
        return { lote, ok: true, data: await consultarTrazabilidadPorLote(lote) };
      } catch (error) {
        return { lote, ok: false, error: error.message };
      }
    }));
    resultados.push(...grupo);
  }
  return resultados;
}

export async function consolidarLotes(lotes) {
  const resultados = await consultarLotes(lotes);
  return {
    generado_en: new Date().toISOString(),
    mapeo_normativo: 'PENDIENTE DE VALIDACION DE CAMPOS ARTICULO 22',
    solicitados: lotes.length,
    encontrados: resultados.filter((item) => item.ok).length,
    errores: resultados.filter((item) => !item.ok).map((item) => ({ lote: item.lote, error: item.error })),
    lotes: resultados.filter((item) => item.ok).map((item) => item.data)
  };
}

function hoja(libro, nombre, columnas, filas) {
  const hojaActual = libro.addWorksheet(nombre);
  hojaActual.columns = columnas.map(([header, key, width]) => ({ header, key, width }));
  hojaActual.getRow(1).font = { bold: true };
  filas.forEach((fila) => hojaActual.addRow(fila));
  hojaActual.autoFilter = {
    from: 'A1',
    to: hojaActual.getRow(1).getCell(columnas.length).address
  };
  return hojaActual;
}

export async function generarExcelMultilote(lotes) {
  const consolidado = await consolidarLotes(lotes);
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Trazaap';
  libro.created = new Date();

  hoja(libro, 'Resumen', [
    ['Lote', 'lote', 24],
    ['Producto', 'producto', 30],
    ['Fabricacion', 'fabricacion', 22],
    ['Vencimiento', 'vencimiento', 16],
    ['Liberacion', 'liberacion', 18],
    ['Eventos', 'eventos', 12],
    ['Despachos', 'despachos', 12],
    ['Alertas vencimiento', 'alertas', 20]
  ], consolidado.lotes.map((item) => ({
    lote: item.lote,
    producto: item.produccion?.productos?.map((producto) => producto.producto).join(', ') || '',
    fabricacion: item.produccion?.manufactura?.hora_inicio || '',
    vencimiento: item.liberacion?.fecha_vencimiento || '',
    liberacion: item.liberacion?.estado_liberacion || '',
    eventos: item.eventos?.length || 0,
    despachos: item.despachos?.length || 0,
    alertas: item.alertasVencimiento?.length || 0
  })));

  hoja(libro, 'Origen', [
    ['Lote final', 'lote', 24],
    ['Materia prima', 'materia', 30],
    ['Lote origen', 'origen', 24],
    ['Proveedor', 'proveedor', 30],
    ['Inspeccion', 'inspeccion', 18]
  ], consolidado.lotes.flatMap((item) => (item.recepciones || []).map((recepcion) => ({
    lote: item.lote,
    materia: recepcion.materia_prima,
    origen: recepcion.numero_lote,
    proveedor: recepcion.proveedor?.nombre,
    inspeccion: (item.inspecciones || []).find((inspeccion) => inspeccion.recepcion_id === recepcion.id)?.decision_final || ''
  }))));

  hoja(libro, 'Despachos', [
    ['Lote', 'lote', 24],
    ['Codigo', 'codigo', 24],
    ['Cliente', 'cliente', 30],
    ['Fecha', 'fecha', 22],
    ['Cantidad', 'cantidad', 12],
    ['Estado', 'estado', 20]
  ], consolidado.lotes.flatMap((item) => (item.despachos || []).map((despacho) => ({
    lote: item.lote,
    codigo: despacho.codigo_despacho,
    cliente: despacho.cliente,
    fecha: despacho.fecha_despacho,
    cantidad: (despacho.detalles || [])
      .filter((detalle) => detalle.lote === item.lote)
      .reduce((total, detalle) => total + Number(detalle.cantidad_despachada || 0), 0),
    estado: despacho.estado_despacho
  }))));

  hoja(libro, 'Errores', [
    ['Lote', 'lote', 24],
    ['Error', 'error', 80]
  ], consolidado.errores);

  const buffer = await libro.xlsx.writeBuffer();
  return {
    buffer,
    nombre: `trazabilidad-multilote-${new Date().toISOString().slice(0, 10)}.xlsx`,
    consolidado
  };
}
