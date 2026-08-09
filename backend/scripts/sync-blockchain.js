import { poolPostgres } from '../src/configuracion/postgresql.js';
import {
  registrarEventoCritico,
  validarEventoCritico
} from '../src/modulos/blockchain/blockchain.service.js';

const eventos = [
  {
    tipo: 'recepcion_materia_prima',
    sql: 'SELECT id FROM receptions ORDER BY id',
    id: (row) => row.id
  },
  {
    tipo: 'inspeccion_recepcion',
    sql: 'SELECT id FROM reception_inspections ORDER BY id',
    id: (row) => row.id
  },
  {
    tipo: 'orden_produccion',
    sql: 'SELECT id FROM ordenes_produccion ORDER BY id',
    id: (row) => row.id
  },
  {
    tipo: 'producto_fabricado_configurado',
    sql: 'SELECT id FROM productos_fabricados ORDER BY id',
    id: (row) => row.id
  },
  {
    tipo: 'registro_manufactura',
    sql: 'SELECT id_manufactura FROM registro_manufactura ORDER BY id_manufactura',
    id: (row) => row.id_manufactura
  },
  {
    tipo: 'liberacion_producto',
    sql: 'SELECT id_liberacion FROM liberacion_producto ORDER BY id_liberacion',
    id: (row) => row.id_liberacion
  },
  {
    tipo: 'inventario_producto_terminado',
    sql: 'SELECT id_inventario FROM inventario_producto_terminado ORDER BY id_inventario',
    id: (row) => row.id_inventario
  },
  {
    tipo: 'inventario_materia_prima',
    sql: 'SELECT id FROM inventario_materias_primas ORDER BY id',
    id: (row) => row.id
  },
  {
    tipo: 'movimiento_inventario',
    sql: 'SELECT id FROM inventario_movimientos ORDER BY id',
    id: (row) => row.id
  }
];

async function sincronizarEvento({ tipo, sql, id }) {
  const { rows } = await poolPostgres.query(sql);
  let registrados = 0;
  let omitidos = 0;
  let pendientes = 0;

  for (const row of rows) {
    const idEntidad = id(row);
    const validacion = await validarEventoCritico(tipo, idEntidad);

    if (validacion?.estadoBlockchain === 'VERIFICADO') {
      omitidos += 1;
      console.log(`[OK] ${tipo}:${idEntidad} ya estaba verificado`);
      continue;
    }

    if (validacion?.estadoBlockchain === 'ALTERADO') {
      omitidos += 1;
      console.log(`[ALTERADO] ${tipo}:${idEntidad} conserva su evidencia original; requiere correccion auditada`);
      continue;
    }

    if (validacion?.estadoBlockchain === 'PENDIENTE') {
      pendientes += 1;
      console.log(`[PENDIENTE] ${tipo}:${idEntidad} - Fabric no esta disponible`);
      continue;
    }

    const resultado = await registrarEventoCritico(tipo, idEntidad, 'sincronizacion');

    if (resultado?.estado === 'REGISTRADO' || resultado?.valido) {
      registrados += 1;
      console.log(`[REGISTRADO] ${tipo}:${idEntidad}`);
    } else {
      pendientes += 1;
      console.log(`[PENDIENTE] ${tipo}:${idEntidad} - ${resultado?.mensaje || 'sin respuesta'}`);
    }
  }

  return { tipo, total: rows.length, registrados, omitidos, pendientes };
}

async function main() {
  console.log('Sincronizando eventos operativos con Hyperledger Fabric...');

  const resumen = [];
  for (const evento of eventos) {
    resumen.push(await sincronizarEvento(evento));
  }

  console.table(resumen);
}

main()
  .catch((error) => {
    console.error('No fue posible sincronizar blockchain:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await poolPostgres.end();
  });
