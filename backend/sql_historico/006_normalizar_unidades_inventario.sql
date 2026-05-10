UPDATE inventario_materias_primas i
SET unidad_medida = rm.unidad_medida_base,
    fecha_actualizacion = NOW()
FROM raw_materials rm
WHERE rm.id = i.materia_prima_id
  AND rm.unidad_medida_base IS NOT NULL
  AND i.unidad_medida <> rm.unidad_medida_base;
