# Auditoría end-to-end de Trazaap con Playwright

## Estado de la auditoría

La auditoría se ejecutó el 26 de septiembre de 2026 sobre la aplicación local con el frontend en `http://localhost:3000` y el backend en `http://localhost:4000`. Se utilizó Chromium mediante Playwright `1.63.0`, Node.js `v24.11.1` y npm `11.6.2`.

La ejecución no modificó la lógica funcional de Trazaap ni creó registros operativos. Se instalaron únicamente las dependencias y los archivos necesarios para la prueba automatizada.

## Resultado reproducido

| Indicador | Resultado |
|---|---:|
| Comprobaciones Playwright | 118 |
| Comprobaciones observadas o aprobadas | 118 |
| Fallos funcionales reproducibles | 0 |
| Errores JavaScript de página | 0 |
| Solicitudes de red fallidas | 0 |
| Evidencias visuales PNG | 108 |

Se revisaron las rutas públicas del inicio de sesión, las vistas de administrador, gerente y operario, las restricciones RBAC, la apertura y cancelación de formularios y la consulta interna de trazabilidad por lote.

## Cobertura ejecutada

- Acceso al inicio de sesión y consulta interna por lote.
- Consulta de lote existente (`7878`) y consulta controlada de un lote inexistente.
- Inicio de sesión por los tres perfiles operativos disponibles.
- Carga de panel, proveedores, materias primas, recepciones, producción, almacenamiento, liberación, despachos, trazabilidad, inventario, reportes, documentos y usuarios.
- Verificación de redirecciones esperadas para módulos no autorizados por rol.
- Apertura y cancelación de formularios visibles en proveedores, materias primas, recepciones, producción, almacenamiento, despachos y usuarios.
- Generación del reporte de trazabilidad para el lote `7878` y apertura de `/reportes/trazabilidad/7878` en una nueva pestaña.
- Recolección de errores de consola, errores de página, solicitudes fallidas, respuestas 5xx y capturas de pantalla.

## Respuestas HTTP que no son fallos

La auditoría registró respuestas `403` cuando el operario intentó cargar endpoints que su rol no puede consultar, como usuarios, documentos, inventarios gerenciales y alertas de vencimiento. Estas respuestas son coherentes con el RBAC actual y no se clasifican como defectos funcionales.

También se registró `404` al consultar deliberadamente el lote `PLAYWRIGHT-LOTE-INEXISTENTE`. Esto comprueba el comportamiento esperado para un lote que no existe y no representa un error de la aplicación.

Como mejora técnica no bloqueante, el frontend podría evitar solicitar esos endpoints antes de aplicar la restricción de rol, para mantener la consola limpia y reducir llamadas innecesarias. Esta observación no requiere una corrección funcional urgente.

## Instrucción de corrección

En la corrida actual no existe una corrección funcional obligatoria: no se reprodujeron fallos en las 118 comprobaciones. No modificar los módulos funcionales únicamente con base en esta auditoría.

Si una ejecución posterior reporta un fallo, aplicar el siguiente procedimiento para cada caso:

1. Reproducirlo con la misma URL, rol y datos indicados en `resultado-auditoria.json`.
2. Revisar primero la captura PNG asociada en `pruebas/evidencia-playwright/`.
3. Confirmar si el fallo pertenece al frontend, al backend, PostgreSQL, MinIO o Fabric.
4. Corregir la causa raíz manteniendo la separación por módulos y actualizando validaciones, rutas, servicios y base de datos cuando el cambio afecte el modelo operativo.
5. Añadir o actualizar una prueba automatizada que reproduzca el caso.
6. Ejecutar nuevamente la auditoría completa y aceptar la corrección únicamente si el caso falla antes del cambio y pasa después, sin introducir errores nuevos.

No ocultar errores de consola, no convertir respuestas `403` esperadas en aprobaciones artificiales y no eliminar validaciones de seguridad para hacer pasar una prueba.

## Ejecución reproducible

Desde la carpeta `frontend`:

```powershell
npm.cmd install
npx.cmd playwright install chromium
node pruebas/playwright/auditoria-e2e.mjs
```

La aplicación debe estar disponible en los puertos 3000 y 4000. Las credenciales de prueba pueden reemplazarse mediante las variables `PW_ADMIN_EMAIL`, `PW_ADMIN_PASSWORD`, `PW_GERENTE_EMAIL`, `PW_GERENTE_PASSWORD`, `PW_OPERARIO_EMAIL` y `PW_OPERARIO_PASSWORD`, sin escribir contraseñas en el repositorio.

## Evidencia generada

- Resultado estructurado: `pruebas/evidencia-playwright/resultado-auditoria.json`.
- Resumen legible: `pruebas/evidencia-playwright/resultado-auditoria.md`.
- Capturas de cada ruta, rol y formulario: `pruebas/evidencia-playwright/*.png`.
- Script de auditoría: `frontend/pruebas/playwright/auditoria-e2e.mjs`.

Como comprobación complementaria, `npm.cmd run build` del frontend terminó correctamente y generó las 22 rutas actuales sin errores de compilación.

## Alcance pendiente

Esta auditoría validó navegación, autorización, carga de vistas y disponibilidad de formularios sin contaminar la base operativa con datos de prueba. Para declarar validado el flujo completo de negocio todavía debe ejecutarse, sobre una base aislada, un recorrido con datos controlados que registre una recepción, inspección, orden, manufactura, liberación, despacho parcial, trazabilidad, reporte y validación blockchain. Esa ejecución debe conservar sus propias capturas y resultados de backend/Fabric.
