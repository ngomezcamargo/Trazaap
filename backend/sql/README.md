# Esquema de PostgreSQL

El unico archivo SQL del proyecto es:

```text
001_schema_actual.sql
```

El archivo contiene el esquema operativo vigente completo: autenticacion, proveedores,
recepciones, inventarios, produccion, almacenamiento, liberacion, despachos, documentos,
interoperabilidad y alertas.

El seed se ejecuta por separado con `npm run seed`, porque necesita generar hashes de
contrasena y cargar el catalogo de productos de forma idempotente. Los datos de prueba
de materias primas se cargan con `npm run seed:materias` cuando se necesitan.
