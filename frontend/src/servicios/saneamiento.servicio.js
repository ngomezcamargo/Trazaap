import{api}from'./api';export const saneamientoServicio={listar:()=>api.get('/saneamiento'),crear:d=>api.post('/saneamiento',d)};
