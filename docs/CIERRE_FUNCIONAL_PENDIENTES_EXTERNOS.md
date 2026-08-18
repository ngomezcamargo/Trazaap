# Cierre funcional: parámetros pendientes de validación externa

Este documento separa infraestructura implementada de valores que Trazaap no debe inventar antes de QA.

## RF04 — Refrigeración

El producto permite configurar categoría, indicador de refrigeración y temperaturas mínima/máxima. Almacenamiento registra ubicación, medición de ingreso, controles, salida, resultado de rango, condición general, observaciones, retención y resolución. La referencia `4 °C ± 2 °C` no se asigna automáticamente a ningún producto.

`PENDIENTE DE VALIDACIÓN DEL INGENIERO DE ALIMENTOS`: productos/categorías aplicables, valores definitivos, periodicidad y reacción obligatoria ante desviación.

## RF07/RF08 — Calidad e inocuidad

Las categorías físico, químico, microbiológico, organoléptico, HACCP/proceso y producto terminado admiten mínimo, máximo, valor esperado, unidad, referencia, conformidad, alerta, decisión y observaciones. Administración puede crear, editar, activar y desactivar definiciones. No se precargan límites HACCP.

`PENDIENTE DE VALIDACIÓN DEL INGENIERO DE ALIMENTOS`: parámetros, rangos, referencias y reacción final.

## RF15 — Saneamiento

Las actividades se pueden programar y luego ejecutar, conservando procedimiento, responsable, checklist, resultado, observaciones e histórico. Una ejecución cerrada no puede repetirse sobre el mismo registro.

`PENDIENTE DE VALIDACIÓN DEL INGENIERO DE ALIMENTOS`: plantillas sanitarias y listas de chequeo definitivas.

## RF14 — Reportes

Se conservan reporte individual imprimible/guardable como PDF, consolidación de hasta 50 lotes y Excel. La respuesta consolidada incluye explícitamente `PENDIENTE DE VALIDACION DE CAMPOS ARTICULO 22`; las hojas se generan desde el modelo consolidado, por lo que pueden agregarse columnas sin reemplazar persistencia ni trazabilidad.

`PENDIENTE DE VALIDACIÓN DE CAMPOS ARTÍCULO 22`: mapeo normativo final aprobado.

## GS1

GTIN, GLN, SSCC y EPC se reciben mediante el mapeo existente. Los valores de tests son ficticios y no representan a Angela's Bagels.

`DATOS MAESTROS GS1 PENDIENTES DE LA EMPRESA`.
