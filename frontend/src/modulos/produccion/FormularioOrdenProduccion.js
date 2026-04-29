'use client';

import { useEffect, useState } from 'react';
import { produccionServicio } from '@/servicios/produccion.servicio';

export function FormularioOrdenProduccion() {
  const [ordenes, setOrdenes] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [ordenId, setOrdenId] = useState('');
  const [productos, setProductos] = useState([{ producto: '', tamano_presentacion: 'mediano', cantidad_programada: '', cantidad_real_producida: '', unidad_medida: 'unidades', lote_producto_terminado: '' }]);
  const [formOrden, setFormOrden] = useState({ fecha_produccion: new Date().toISOString().slice(0, 10), codigo_orden: '', responsable_produccion: '1', estado: 'pendiente', observaciones: '', creado_por: '1' });
  const [materia, setMateria] = useState({ orden_producto_id: '', recepcion_id: '', nombre_ingrediente: '', cantidad_planificada: '', cantidad_real: '', unidad_medida: 'gramos', observaciones: '' });
  const [moje, setMoje] = useState({ producto_receta: '', cantidad_total_moje_gramos: '', recepcion_id: '', ingrediente: '', lote_ingrediente: '', cantidad_gramos: '' });
  const [tiempo, setTiempo] = useState({ numero_carro_escabiladero: '', producto: '', es_bagel: false, unidades_producidas: '', temperatura_crecimiento: '', tiempo_crecimiento_min: '', temperatura_inmersion_agua: '', tiempo_inmersion_agua_seg: '', temperatura_horneo: '', tiempo_horneo_min: '', lote_producto: '', responsable_produccion: '1', observaciones: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const cargar = async () => {
    const [ops, recs] = await Promise.all([produccionServicio.listarOrdenes(), produccionServicio.listarRecepcionesDisponibles()]);
    setOrdenes(ops);
    setRecepciones(recs);
  };
  useEffect(() => { cargar().catch((e) => setError(e.message)); }, []);

  const crearOrden = async (e) => {
    e.preventDefault(); setError('');
    try {
      const created = await produccionServicio.crearOrden({ ...formOrden, productos });
      setOrdenId(String(created.id));
      setMessage('Orden creada con formato Angela\'s Bagels');
      await cargar();
    } catch (err) { setError(err.message); }
  };

  return <div className="tarjeta">
    <h3>Orden de produccion diaria</h3>
    <form onSubmit={crearOrden}><div className="grid grid-2">
      <div className="campo"><label>Fecha de produccion</label><input type="date" required value={formOrden.fecha_produccion} onChange={(e)=>setFormOrden({...formOrden,fecha_produccion:e.target.value})}/></div>
      <div className="campo"><label>Codigo de orden</label><input required value={formOrden.codigo_orden} onChange={(e)=>setFormOrden({...formOrden,codigo_orden:e.target.value})}/></div>
      <div className="campo"><label>Responsable</label><input required value={formOrden.responsable_produccion} onChange={(e)=>setFormOrden({...formOrden,responsable_produccion:e.target.value})}/></div>
      <div className="campo"><label>Estado</label><select value={formOrden.estado} onChange={(e)=>setFormOrden({...formOrden,estado:e.target.value})}><option>pendiente</option><option>en_proceso</option><option>finalizada</option><option>cancelada</option></select></div>
      <div className="campo"><label>Producto</label><input required value={productos[0].producto} onChange={(e)=>setProductos([{...productos[0],producto:e.target.value}])}/></div>
      <div className="campo"><label>Tamano</label><select value={productos[0].tamano_presentacion} onChange={(e)=>setProductos([{...productos[0],tamano_presentacion:e.target.value}])}><option>grande</option><option>mediano</option><option>pequeno</option><option>personal</option><option>mini</option><option>cocktail</option></select></div>
      <div className="campo"><label>Cantidad programada</label><input type="number" min="0.01" required value={productos[0].cantidad_programada} onChange={(e)=>setProductos([{...productos[0],cantidad_programada:e.target.value}])}/></div>
      <div className="campo"><label>Cantidad real producida</label><input type="number" min="0" required value={productos[0].cantidad_real_producida} onChange={(e)=>setProductos([{...productos[0],cantidad_real_producida:e.target.value}])}/></div>
      <div className="campo"><label>Lote terminado</label><input value={productos[0].lote_producto_terminado} onChange={(e)=>setProductos([{...productos[0],lote_producto_terminado:e.target.value}])}/></div>
    </div><div className="acciones"><button className="boton" type="submit">Guardar orden</button></div></form>

    <hr style={{margin:'16px 0'}} />
    <div className="campo"><label>Orden activa</label><select value={ordenId} onChange={(e)=>setOrdenId(e.target.value)}><option value="">Selecciona</option>{ordenes.map((o)=><option key={o.id} value={o.id}>{o.codigo_orden} - {o.fecha_produccion}</option>)}</select></div>

    <h4>Ingredientes por producto</h4>
    <form onSubmit={async (e)=>{e.preventDefault(); try { await produccionServicio.asociarMaterias(Number(ordenId), { materias:[materia] }); setMessage('Ingrediente registrado'); } catch(err){setError(err.message);} }}><div className="grid grid-2">
      <div className="campo"><label>Producto de la orden (id)</label><input required value={materia.orden_producto_id} onChange={(e)=>setMateria({...materia,orden_producto_id:e.target.value})}/></div>
      <div className="campo"><label>Lote ingrediente (recepcion)</label><select required value={materia.recepcion_id} onChange={(e)=>setMateria({...materia,recepcion_id:e.target.value})}><option value="">Selecciona</option>{recepciones.map((r)=><option key={r.id} value={r.id}>{r.lote_proveedor}</option>)}</select></div>
      <div className="campo"><label>Ingrediente</label><input required value={materia.nombre_ingrediente} onChange={(e)=>setMateria({...materia,nombre_ingrediente:e.target.value})}/></div>
      <div className="campo"><label>Planificada (g)</label><input type="number" min="0.01" required value={materia.cantidad_planificada} onChange={(e)=>setMateria({...materia,cantidad_planificada:e.target.value})}/></div>
      <div className="campo"><label>Real (g)</label><input type="number" min="0.01" required value={materia.cantidad_real} onChange={(e)=>setMateria({...materia,cantidad_real:e.target.value})}/></div>
    </div><div className="acciones"><button className="boton" type="submit">Agregar ingrediente</button></div></form>

    <h4>Mojes</h4>
    <form onSubmit={async (e)=>{e.preventDefault(); try { await produccionServicio.registrarMojes(Number(ordenId), { mojes:[{ producto_receta: moje.producto_receta, cantidad_total_moje_gramos: moje.cantidad_total_moje_gramos, ingredientes:[{ recepcion_id: moje.recepcion_id, ingrediente: moje.ingrediente, lote_ingrediente: moje.lote_ingrediente, cantidad_gramos: moje.cantidad_gramos }] }] }); setMessage('Moje registrado'); } catch(err){setError(err.message);} }}><div className="grid grid-2">
      <div className="campo"><label>Producto/receta</label><input required value={moje.producto_receta} onChange={(e)=>setMoje({...moje,producto_receta:e.target.value})}/></div>
      <div className="campo"><label>Total moje (g)</label><input type="number" min="0.01" required value={moje.cantidad_total_moje_gramos} onChange={(e)=>setMoje({...moje,cantidad_total_moje_gramos:e.target.value})}/></div>
      <div className="campo"><label>Ingrediente</label><input required value={moje.ingrediente} onChange={(e)=>setMoje({...moje,ingrediente:e.target.value})}/></div>
      <div className="campo"><label>Lote ingrediente</label><input required value={moje.lote_ingrediente} onChange={(e)=>setMoje({...moje,lote_ingrediente:e.target.value})}/></div>
      <div className="campo"><label>Cantidad ingrediente (g)</label><input type="number" min="0.01" required value={moje.cantidad_gramos} onChange={(e)=>setMoje({...moje,cantidad_gramos:e.target.value})}/></div>
      <div className="campo"><label>Recepcion ingrediente</label><select required value={moje.recepcion_id} onChange={(e)=>setMoje({...moje,recepcion_id:e.target.value})}><option value="">Selecciona</option>{recepciones.map((r)=><option key={r.id} value={r.id}>{r.lote_proveedor}</option>)}</select></div>
    </div><div className="acciones"><button className="boton" type="submit">Guardar moje</button></div></form>

    <h4>Registro de tiempos por carro/escabiladero</h4>
    <form onSubmit={async (e)=>{e.preventDefault(); try { await produccionServicio.registrarTiempos(Number(ordenId), { registros:[tiempo] }); setMessage('Tiempo registrado'); } catch(err){setError(err.message);} }}><div className="grid grid-2">
      <div className="campo"><label>Carro/escabiladero</label><input required value={tiempo.numero_carro_escabiladero} onChange={(e)=>setTiempo({...tiempo,numero_carro_escabiladero:e.target.value})}/></div>
      <div className="campo"><label>Producto</label><input required value={tiempo.producto} onChange={(e)=>setTiempo({...tiempo,producto:e.target.value})}/></div>
      <div className="campo"><label>Unidades producidas</label><input type="number" min="0" required value={tiempo.unidades_producidas} onChange={(e)=>setTiempo({...tiempo,unidades_producidas:e.target.value})}/></div>
      <div className="campo"><label>Temp. crecimiento (25-35)</label><input type="number" required value={tiempo.temperatura_crecimiento} onChange={(e)=>setTiempo({...tiempo,temperatura_crecimiento:e.target.value})}/></div>
      <div className="campo"><label>Tiempo crecimiento (min)</label><input type="number" min="0" required value={tiempo.tiempo_crecimiento_min} onChange={(e)=>setTiempo({...tiempo,tiempo_crecimiento_min:e.target.value})}/></div>
      <div className="campo"><label>Es bagel</label><input type="checkbox" checked={tiempo.es_bagel} onChange={(e)=>setTiempo({...tiempo,es_bagel:e.target.checked})}/></div>
      <div className="campo"><label>Temp. inmersion (85-95 bagel)</label><input type="number" value={tiempo.temperatura_inmersion_agua} onChange={(e)=>setTiempo({...tiempo,temperatura_inmersion_agua:e.target.value})}/></div>
      <div className="campo"><label>Tiempo inmersion (seg)</label><input type="number" min="0" value={tiempo.tiempo_inmersion_agua_seg} onChange={(e)=>setTiempo({...tiempo,tiempo_inmersion_agua_seg:e.target.value})}/></div>
      <div className="campo"><label>Temp. horneo (150-175)</label><input type="number" required value={tiempo.temperatura_horneo} onChange={(e)=>setTiempo({...tiempo,temperatura_horneo:e.target.value})}/></div>
      <div className="campo"><label>Tiempo horneo (min)</label><input type="number" min="0" required value={tiempo.tiempo_horneo_min} onChange={(e)=>setTiempo({...tiempo,tiempo_horneo_min:e.target.value})}/></div>
      <div className="campo"><label>Lote producto</label><input required value={tiempo.lote_producto} onChange={(e)=>setTiempo({...tiempo,lote_producto:e.target.value})}/></div>
      <div className="campo"><label>Observaciones (fuera de rango)</label><input value={tiempo.observaciones} onChange={(e)=>setTiempo({...tiempo,observaciones:e.target.value})}/></div>
    </div><div className="acciones"><button className="boton" type="submit">Guardar tiempos</button></div></form>

    {message && <div className="alerta ok">{message}</div>}
    {error && <div className="alerta error">{error}</div>}
  </div>;
}
