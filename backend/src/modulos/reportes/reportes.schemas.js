import{z}from'zod';export const multiloteSchema=z.object({lotes:z.array(z.string().trim().min(2).max(100)).min(1).max(50)}).transform(d=>({...d,lotes:[...new Set(d.lotes)]}));
