import { api } from './api';
export const envasadoServicio={listar:()=>api.get('/envasado'),pendientes:()=>api.get('/envasado/pendientes'),crear:(d)=>api.post('/envasado',d)};
