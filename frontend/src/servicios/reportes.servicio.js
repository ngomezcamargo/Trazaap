import{api}from'./api';export const reportesServicio={consolidar:lotes=>api.post('/reportes/multilote',{lotes}),excel:lotes=>api.descargarPost('/reportes/multilote/excel',{lotes})};
