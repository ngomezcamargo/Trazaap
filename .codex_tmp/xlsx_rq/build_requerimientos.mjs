import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = process.cwd();
const outputDir = path.join(root, "outputs", "019dfa6b-498f-7941-8b7f-df873e46a001");
const outputPath = path.join(outputDir, "Seguimiento_Requerimientos_Trazaap.xlsx");

const functionalRows = [
  ["RF01-A", "Recepcion de materias primas", "Funcional", "Completado", "Alto", "Backend, Frontend, BD, Fabric", "Recepcion registra datos operativos, inspeccion inicial e inventario de materia prima. Se registra evidencia Fabric para recepcion, inventario y movimiento.", "Validar con datos reales de Angela's Bagels y ajustar textos del formato si el director lo exige."],
  ["RF01-B", "Inspeccion y decision de aceptacion", "Funcional", "Completado", "Alto", "Backend, Frontend, BD, Fabric", "Inspeccion se diligencia dentro del formulario de recepcion. Incluye producto, transporte, vehiculo/conductor y decision final. Se registra evidencia Fabric.", "Revisar si el formato final pide algun campo adicional de calidad."],
  ["RF02", "Eventos de fabricacion", "Funcional", "Completado", "Alto", "Backend, Frontend, BD, Fabric", "Se separo orden de produccion y registro de manufactura. Manufactura captura lote producido, unidades, tiempos/temperaturas reales y responsable operario.", "Extender si aparecen nuevas etapas internas de fabricacion."],
  ["RF03-A", "Registro de envasado y embalado", "Funcional", "Completado", "Alto", "Backend, Frontend, BD, Fabric", "La liberacion de producto funciona como control final/embalado y salida. Incluye empaque, envase, etiqueta, factura, conductor y placa.", "Si la empresa separa embalado y despacho, crear modulo especifico despues."],
  ["RF03-B", "Identificador unico de lote", "Funcional", "Completado", "Alto", "Backend, Frontend, Reportes", "El lote producido se registra desde manufactura y se usa como eje para trazabilidad, QR y reportes.", "Definir formalmente el patron de codificacion de lotes si lo exige el documento final."],
  ["RF05", "Distribucion y comercializacion", "Funcional", "En proceso", "Medio", "Liberacion, Portal publico", "La liberacion captura factura, conductor, placa y datos de entrega. Aun no existe un modulo independiente de despacho/comercializacion.", "Decidir si liberacion = despacho para el alcance o si se crea despacho separado."],
  ["RF06", "Trazabilidad bidireccional", "Funcional", "Completado", "Alto", "Backend, Frontend, Fabric", "La consulta por lote producido reconstruye recepcion, inspeccion, produccion, manufactura, liberacion, inventarios y movimientos.", "Probar multiples productos por orden y varios insumos para validar casos complejos."],
  ["RF07", "Puntos criticos HACCP", "Funcional", "En proceso", "Medio", "Produccion, Recepcion, Liberacion", "Hay controles de temperatura/tiempos e inspecciones con advertencias, pero no existe modulo HACCP formal con puntos criticos configurables.", "Crear matriz HACCP si el alcance final lo exige."],
  ["RF08", "Control de calidad e inocuidad", "Funcional", "En proceso", "Medio", "Recepcion, Liberacion", "Existen inspeccion de recepcion y validaciones de liberacion. No hay aun laboratorio/microbiologia/fisicoquimicos estructurados.", "Definir si basta con inspeccion operativa o si se requiere modulo de calidad."],
  ["RF09", "Generacion de bloques inmutables", "Funcional", "Completado", "Alto", "Fabric Chaincode, Backend", "El chaincode registra eventos criticos, calcula hash en Fabric y valida payload actual contra evidencia.", "Mantener Fabric encendido/sincronizado para demos."],
  ["RF10", "Codigo QR de lote", "Funcional", "Completado", "Alto", "Frontend, Reportes, Portal publico", "El reporte genera QR por lote y la ruta publica /verificar/:lote muestra trazabilidad publica.", "Verificar legibilidad fisica del QR al imprimir etiquetas."],
  ["RF11", "Portal web publico QR", "Funcional", "Completado", "Alto", "Frontend, Backend Publico", "Portal publico muestra informacion limitada al consumidor. Cliente e INVIMA usan acceso controlado con factura/codigo.", "Ajustar redaccion publica con el director/empresa."],
  ["RF12", "Control de acceso por roles (RBAC)", "Funcional", "Completado", "Alto", "Backend, Frontend, Docs", "Se implementaron roles administrador, gerente y operario. Backend aplica permisos; frontend oculta opciones.", "Probar manualmente cada rol con usuarios reales."],
  ["RF13", "Contratos inteligentes / chaincode", "Funcional", "Completado", "Alto", "Fabric Chaincode", "Existe chaincode traceability con registrarEvento, validarEvento, consultarEvento y consultarEventosPorLote.", "Podria crecer con reglas de negocio mas estrictas por evento."],
  ["RF14", "Reportes de trazabilidad para INVIMA", "Funcional", "Completado", "Alto", "Frontend, Backend, Fabric", "Reporte imprimible/PDF incluye eventos, hashes, QR, codigos cliente/auditoria y leyenda blockchain.", "Validar formato contra Articulo 22 de Resolucion 2674."],
  ["RF15", "Plan de saneamiento", "Funcional", "Nada", "Medio", "No implementado", "No existe modulo para actividades de limpieza, desinfeccion, control de plagas o residuos.", "Pendiente si entra en alcance final."],
  ["RF16", "Devoluciones y lotes no conformes", "Funcional", "Nada", "Medio", "No implementado", "No existe flujo de devoluciones, retiro, reproceso o destruccion.", "Pendiente para cierre funcional amplio."],
  ["RF17", "Registro de proveedores", "Funcional", "Completado", "Medio", "Backend, Frontend, BD, RBAC", "Modulo de proveedores permite gestion administrativa y se enlaza con recepciones y trazabilidad.", "Revisar campos documentales/certificaciones si se requiere evidencia adjunta."]
];

const nonFunctionalRows = [
  ["RNF01", "Seguridad e integridad", "No funcional", "Completado", "Alto", "Fabric, Backend", "Fabric valida integridad criptografica. RBAC/JWT protege rutas internas.", "Falta prueba de seguridad formal, pero la base funcional esta."],
  ["RNF02", "Disponibilidad 99%", "No funcional", "En proceso", "Medio", "Docker/Fabric local", "Hay servicios Docker locales, pero no despliegue productivo ni medicion de disponibilidad mensual.", "Requiere infraestructura real o simulacion documentada."],
  ["RNF03", "Trazabilidad temporal verificable", "No funcional", "Completado", "Alto", "BD, Fabric", "Eventos incluyen fechas operativas y timestamp de Fabric. Reportes muestran validacion por etapa.", "Confirmar zona horaria/formato final para auditoria."],
  ["RNF04", "Cumplimiento normativo Res. 2674/2013", "No funcional", "En proceso", "Alto", "Reportes, Trazabilidad", "La trazabilidad y reportes estan orientados al cumplimiento. Falta validacion documental final contra cada campo normativo.", "Cruzar reporte final con matriz Articulo 22."],
  ["RNF05", "Rendimiento", "No funcional", "En proceso", "Medio", "Backend, Fabric", "El sistema compila y responde localmente. No se han hecho pruebas de carga ni medicion formal de 3s/10s.", "Realizar prueba de tiempos con datos de demo."],
  ["RNF06", "Usabilidad", "No funcional", "En proceso", "Medio", "Frontend", "Se mejoraron formularios, modales, barra lateral fija, estetica y cierre automatico. Falta prueba formal con usuarios.", "Aplicar prueba controlada con operarios."],
  ["RNF07", "Confidencialidad diferenciada", "No funcional", "Completado", "Alto", "Portal publico, RBAC", "Consumidor no ve datos sensibles ni hashes. Cliente/INVIMA acceden con factura/codigo. Internos usan RBAC.", "Revisar si se deben ocultar mas datos en vista cliente."],
  ["RNF08", "Confiabilidad del consenso", "No funcional", "En proceso", "Alto", "Fabric local", "Existe red Fabric local con orderer y peers, pero no se ha demostrado tolerancia real a fallos en infraestructura distribuida.", "Documentar limites de demo local frente a despliegue real."],
  ["RNF09", "Escalabilidad", "No funcional", "En proceso", "Medio", "Backend, BD, Fabric", "Hay arquitectura modular y Docker, pero no pruebas de volumen 10x ni escalado de nodos.", "Pendiente prueba de volumen o justificacion academica."],
  ["RNF10", "Mantenibilidad", "No funcional", "Completado", "Medio", "Docs, Modulos", "Arquitectura modular, docs RBAC, acceso externo y validacion blockchain. Pruebas backend basicas.", "Mejorar cobertura de tests si hay tiempo."],
  ["RNF11", "Interoperabilidad", "No funcional", "En proceso", "Medio", "API REST, QR", "API REST y QR funcionando. No se implemento OAuth 2.0 ni GS1 EPCIS 2.0 formal.", "Pendiente si el jurado exige interoperabilidad estandar."]
];

const nextRows = [
  ["Alta", "Validar flujo completo con datos reales", "Crear una orden con varios productos e insumos, registrar manufactura, liberar y generar reporte.", "Operativo"],
  ["Alta", "Definir si liberacion equivale a despacho", "Si la empresa lo acepta, documentarlo. Si no, crear modulo despacho.", "Alcance"],
  ["Alta", "Cruzar reporte contra Resolucion 2674", "Hacer matriz campo por campo para demostrar cumplimiento documental.", "Normativo"],
  ["Media", "Prueba por roles", "Entrar con administrador, gerente y operario y validar que cada uno ve/puede lo correcto.", "Seguridad"],
  ["Media", "Prueba de Fabric apagado/encendido", "Demostrar PENDIENTE cuando Fabric esta apagado y VERIFICADO cuando esta activo.", "Blockchain"],
  ["Media", "Prueba de alteracion", "Modificar un dato operativo desde BD de prueba y comprobar que Fabric retorna ALTERADO.", "Blockchain"],
  ["Baja", "Modulo saneamiento", "Solo si entra en alcance final.", "Futuro"],
  ["Baja", "Modulo devoluciones", "Solo si entra en alcance final.", "Futuro"]
];

function countByStatus(rows, status) {
  return rows.filter((r) => r[3] === status).length;
}

function pctDone(rows) {
  return rows.length ? countByStatus(rows, "Completado") / rows.length : 0;
}

function applyHeader(range) {
  range.format = {
    fill: "#0B5D2A",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    borders: { preset: "outside", style: "thin", color: "#0B5D2A" }
  };
}

function applyTableStyle(sheet, rangeAddress, statusColAddress) {
  const range = sheet.getRange(rangeAddress);
  range.format = {
    wrapText: true,
    verticalAlignment: "top",
    borders: { preset: "inside", style: "thin", color: "#D9E6DD" }
  };
  const statusRange = sheet.getRange(statusColAddress);
  statusRange.conditionalFormats.add("containsText", {
    text: "Completado",
    format: { fill: "#DFF2E0", font: { color: "#0B6530", bold: true } }
  });
  statusRange.conditionalFormats.add("containsText", {
    text: "En proceso",
    format: { fill: "#FFF3D7", font: { color: "#8A6200", bold: true } }
  });
  statusRange.conditionalFormats.add("containsText", {
    text: "Nada",
    format: { fill: "#FCE7E7", font: { color: "#A51D1D", bold: true } }
  });
}

function setWidths(sheet, widths) {
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, 120, 1).format.columnWidth = width;
  });
}

function writeRequirementsSheet(workbook, name, rows) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  const headers = ["ID", "Requerimiento", "Tipo", "Estado", "Prioridad", "Modulo / area", "Avance actual", "Pendiente / recomendacion"];
  sheet.getRange("A1:H1").values = [headers];
  applyHeader(sheet.getRange("A1:H1"));
  sheet.getRange(`A2:H${rows.length + 1}`).values = rows;
  applyTableStyle(sheet, `A1:H${rows.length + 1}`, `D2:D${rows.length + 1}`);
  sheet.tables.add(`A1:H${rows.length + 1}`, true, `${name.replace(/\s/g, "")}Table`);
  sheet.freezePanes.freezeRows(1);
  setWidths(sheet, [12, 30, 16, 15, 14, 24, 62, 48]);
  sheet.getRange(`A2:H${rows.length + 1}`).format.rowHeight = 54;
  sheet.getRange(`A1:H1`).format.rowHeight = 30;
  sheet.getRange(`A2:F${rows.length + 1}`).format.verticalAlignment = "middle";
  return sheet;
}

const workbook = Workbook.create();
workbook.comments.setSelf({ displayName: "Codex" });

const summary = workbook.worksheets.add("Resumen general");
summary.showGridLines = false;
summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["Seguimiento de requerimientos - Trazaap"]];
summary.getRange("A1").format = {
  fill: "#0B5D2A",
  font: { bold: true, color: "#FFFFFF", size: 16 },
  horizontalAlignment: "center",
  verticalAlignment: "middle"
};
summary.getRange("A2:H2").merge();
summary.getRange("A2").values = [["Estado construido con base en los avances implementados: RBAC, portal externo, trazabilidad, reportes y validacion blockchain."]];
summary.getRange("A2").format = { fill: "#EAF5EE", font: { color: "#244436" }, wrapText: true };

const totalRows = [...functionalRows, ...nonFunctionalRows];
const summaryRows = [
  ["Tipo", "Total", "Completado", "En proceso", "Nada", "% completado", "Lectura general"],
  ["Funcionales", functionalRows.length, countByStatus(functionalRows, "Completado"), countByStatus(functionalRows, "En proceso"), countByStatus(functionalRows, "Nada"), pctDone(functionalRows), "La base operativa, blockchain, QR, reportes y roles estan fuertes. Falta decidir despacho independiente, HACCP formal, saneamiento y devoluciones."],
  ["No funcionales", nonFunctionalRows.length, countByStatus(nonFunctionalRows, "Completado"), countByStatus(nonFunctionalRows, "En proceso"), countByStatus(nonFunctionalRows, "Nada"), pctDone(nonFunctionalRows), "La seguridad, confidencialidad y mantenibilidad van bien. Falta evidencia formal de rendimiento, disponibilidad, escalabilidad e interoperabilidad estandar."],
  ["Total proyecto", totalRows.length, countByStatus(totalRows, "Completado"), countByStatus(totalRows, "En proceso"), countByStatus(totalRows, "Nada"), pctDone(totalRows), "El sistema esta avanzado para una entrega funcional. Lo pendiente es mas de cierre normativo, pruebas y modulos futuros que del flujo central."]
];
summary.getRange("A4:G7").values = summaryRows;
applyHeader(summary.getRange("A4:G4"));
applyTableStyle(summary, "A4:G7", "A5:A7");
summary.getRange("F5:F7").format.numberFormat = "0%";
summary.getRange("A9:H9").merge();
summary.getRange("A9").values = [["Conclusion general"]];
summary.getRange("A9").format = { fill: "#116B35", font: { bold: true, color: "#FFFFFF" } };
summary.getRange("A10:H13").merge();
summary.getRange("A10").values = [[
  "Vamos bien en el nucleo del proyecto: recepcion, inspeccion, produccion, manufactura, liberacion, trazabilidad, QR, reportes, RBAC y validacion blockchain ya tienen implementacion usable. Lo que queda por cerrar se concentra en validacion normativa, pruebas con datos reales, definicion de despacho como etapa separada o integrada a liberacion, y posibles modulos fuera del nucleo como saneamiento y devoluciones."
]];
summary.getRange("A10").format = { wrapText: true, verticalAlignment: "top", fill: "#F7FBF8", borders: { preset: "outside", style: "thin", color: "#CFE0D6" } };
setWidths(summary, [18, 12, 14, 14, 12, 14, 75, 12]);
summary.getRange("A1:H1").format.rowHeight = 34;
summary.getRange("A10:H13").format.rowHeight = 32;

writeRequirementsSheet(workbook, "Funcionales", functionalRows);
writeRequirementsSheet(workbook, "No funcionales", nonFunctionalRows);

const next = workbook.worksheets.add("Pendientes sugeridos");
next.showGridLines = false;
next.getRange("A1:D1").values = [["Prioridad", "Pendiente", "Que hacer", "Categoria"]];
applyHeader(next.getRange("A1:D1"));
next.getRange(`A2:D${nextRows.length + 1}`).values = nextRows;
applyTableStyle(next, `A1:D${nextRows.length + 1}`, `A2:A${nextRows.length + 1}`);
next.tables.add(`A1:D${nextRows.length + 1}`, true, "PendientesTable");
next.freezePanes.freezeRows(1);
setWidths(next, [14, 34, 78, 18]);
next.getRange(`A2:D${nextRows.length + 1}`).format.rowHeight = 50;

const sources = workbook.worksheets.add("Notas");
sources.showGridLines = false;
sources.getRange("A1:B1").values = [["Tema", "Nota"]];
applyHeader(sources.getRange("A1:B1"));
sources.getRange("A2:B7").values = [
  ["Criterio de estado", "Completado = existe flujo usable en codigo. En proceso = hay base funcional pero falta cerrar alcance completo/pruebas. Nada = no hay modulo real implementado."],
  ["Fuente de analisis", "Codigo actual del proyecto Trazaap y avances implementados durante esta sesion."],
  ["RBAC", "Roles internos: administrador, gerente y operario. Cliente, consumidor final e INVIMA no son usuarios internos."],
  ["Blockchain", "Fabric calcula y valida hash desde payload normalizado. PostgreSQL no duplica ledger."],
  ["Reportes", "Reporte imprimible/PDF incluye estados blockchain, QR y codigos de acceso externo."],
  ["Advertencia", "La clasificacion debe revisarse con el director si cambia el alcance formal del proyecto."]
];
applyTableStyle(sources, "A1:B7", "A2:A7");
sources.tables.add("A1:B7", true, "NotasTable");
setWidths(sources, [24, 105]);
sources.getRange("A2:B7").format.rowHeight = 44;

await fs.mkdir(outputDir, { recursive: true });

for (const sheetName of ["Resumen general", "Funcionales", "No funcionales", "Pendientes sugeridos", "Notas"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `${sheetName.replace(/\s/g, "_")}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan"
});
console.log(errors.ndjson);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
