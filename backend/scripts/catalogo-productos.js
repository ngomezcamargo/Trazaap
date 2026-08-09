const variante = (tamanoPresentacion, pesoEstimadoUnidad) => ({
  tamano_presentacion: tamanoPresentacion,
  peso_estimado_unidad: pesoEstimadoUnidad,
  unidad_medida: 'unidad'
});

export const CATALOGO_PRODUCTOS = [
  {
    nombre: 'Bagel',
    categoria: 'Producto principal',
    descripcion: 'Sabores: tradicional, integral, oregano, ajonjoli, girasol, cebolla, con todo, canela pasas, chocolate, amapola, multicereales y arandanos.',
    vida_util_dias: 5,
    requiere_inmersion: true,
    tiempo_fermentacion_minutos: 45,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 15,
    temperatura_horneado_c: 165,
    tiempo_inmersion_minutos: 1,
    temperatura_inmersion_c: 90,
    variantes: [
      variante('grande', 107.5),
      variante('mediano', 67.5),
      variante('pequeno', 47.5),
      variante('cocktail', 27.5)
    ]
  },
  {
    nombre: 'Pan trenza',
    categoria: 'Pan de mesa',
    descripcion: 'Sabores: tradicional, integral, ajonjoli, chocolate, uvas pasas y amapola.',
    vida_util_dias: 5,
    tiempo_fermentacion_minutos: 50,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 20,
    temperatura_horneado_c: 165,
    variantes: [
      variante('grande', 850),
      variante('mediano', 520),
      variante('pequeno', 320),
      variante('personal', 100),
      variante('mini', 60),
      variante('cocktail', 27.5)
    ]
  },
  {
    nombre: 'Pan dinner roll',
    categoria: 'Pan de mesa',
    descripcion: 'Sabores: tradicional e integral.',
    vida_util_dias: 5,
    tiempo_fermentacion_minutos: 50,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 20,
    temperatura_horneado_c: 165,
    variantes: [variante('grande', 105), variante('mediano', 67.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Crouton',
    categoria: 'Derivado de pan',
    descripcion: 'Sabores: tradicional, cebolla y ajo, y finas hierbas.',
    vida_util_dias: 30,
    tiempo_fermentacion_minutos: 0,
    temperatura_fermentacion_c: 0,
    tiempo_horneado_minutos: 15,
    temperatura_horneado_c: 160,
    variantes: [variante('kilo', 1000), variante('libra', 500)]
  },
  {
    nombre: 'Miga de pan',
    categoria: 'Derivado de pan',
    descripcion: 'Miga de pan tradicional.',
    vida_util_dias: 30,
    tiempo_fermentacion_minutos: 0,
    temperatura_fermentacion_c: 0,
    tiempo_horneado_minutos: 15,
    temperatura_horneado_c: 160,
    variantes: [variante('kilo', 1000), variante('libra', 500)]
  },
  {
    nombre: 'Pan molde',
    categoria: 'Pan de mesa',
    descripcion: 'Sabores: tradicional, integral, multicereal y brioche.',
    vida_util_dias: 7,
    tiempo_fermentacion_minutos: 37.5,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 30,
    temperatura_horneado_c: 165,
    variantes: [variante('unico', 550)]
  },
  {
    nombre: 'Pan perro',
    categoria: 'Pan para ensamble',
    descripcion: 'Sabores: tradicional, integral, amapola, ajonjoli y brioche.',
    vida_util_dias: 5,
    tiempo_fermentacion_minutos: 75,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 15,
    temperatura_horneado_c: 165,
    variantes: [variante('grande', 97.5), variante('mediano', 67.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Pan hamburguesa',
    categoria: 'Pan para ensamble',
    descripcion: 'Sabores: tradicional, integral, amapola, ajonjoli y brioche.',
    vida_util_dias: 5,
    tiempo_fermentacion_minutos: 75,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 15,
    temperatura_horneado_c: 165,
    variantes: [variante('grande', 97.5), variante('mediano', 67.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Pan pita',
    categoria: 'Pan para ensamble',
    descripcion: 'Sabores: tradicional e integral.',
    vida_util_dias: 5,
    tiempo_fermentacion_minutos: 75,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 15,
    temperatura_horneado_c: 165,
    variantes: [variante('grande', 97.5), variante('mediano', 67.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Pan arabe',
    categoria: 'Pan para ensamble',
    descripcion: 'Presentacion rectangular o redonda. Sabores: tradicional, integral, finas hierbas y oregano.',
    vida_util_dias: 5,
    tiempo_fermentacion_minutos: 75,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 15,
    temperatura_horneado_c: 165,
    variantes: [variante('grande', 97.5), variante('mediano', 67.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Pan sandwich miga',
    categoria: 'Pan para ensamble',
    descripcion: 'Pan sandwich de miga, sabor tradicional.',
    vida_util_dias: 5,
    tiempo_fermentacion_minutos: 75,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 15,
    temperatura_horneado_c: 165,
    variantes: [variante('grande', 97.5), variante('mediano', 67.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Rollo de canela',
    categoria: 'Pan dulce',
    descripcion: 'Rollo de canela tradicional.',
    vida_util_dias: 5,
    tiempo_fermentacion_minutos: 50,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 20,
    temperatura_horneado_c: 165,
    variantes: [variante('mediano', 67.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Pan de chocolate',
    categoria: 'Pan dulce',
    descripcion: 'Sabores: tradicional y almendras.',
    vida_util_dias: 5,
    tiempo_fermentacion_minutos: 50,
    temperatura_fermentacion_c: 30,
    tiempo_horneado_minutos: 20,
    temperatura_horneado_c: 165,
    variantes: [variante('grande', 95), variante('mediano', 67.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Croissant',
    categoria: 'Pan hojaldrado',
    descripcion: 'Sabores: tradicional, chocolate y almendras.',
    vida_util_dias: 5,
    tiempo_fermentacion_minutos: 60,
    temperatura_fermentacion_c: 28,
    tiempo_horneado_minutos: 20,
    temperatura_horneado_c: 170,
    variantes: [variante('grande', 95), variante('mediano', 67.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Corazones',
    categoria: 'Pan hojaldrado',
    descripcion: 'Sabores: tradicional y chocolate.',
    vida_util_dias: 7,
    tiempo_fermentacion_minutos: 0,
    temperatura_fermentacion_c: 0,
    tiempo_horneado_minutos: 18,
    temperatura_horneado_c: 170,
    variantes: [variante('grande', 67.5), variante('mediano', 47.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Alfajores',
    categoria: 'Galleta',
    descripcion: 'Sabores: chocolate y fresa.',
    vida_util_dias: 15,
    tiempo_fermentacion_minutos: 0,
    temperatura_fermentacion_c: 0,
    tiempo_horneado_minutos: 12,
    temperatura_horneado_c: 170,
    variantes: [variante('grande', 67.5), variante('mediano', 47.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Chips de chocolate',
    categoria: 'Galleta',
    descripcion: 'Galleta con chips de chocolate.',
    vida_util_dias: 15,
    tiempo_fermentacion_minutos: 0,
    temperatura_fermentacion_c: 0,
    tiempo_horneado_minutos: 12,
    temperatura_horneado_c: 170,
    variantes: [variante('grande', 67.5), variante('mediano', 47.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Avena con pasas',
    categoria: 'Galleta',
    descripcion: 'Galleta de avena y uvas pasas.',
    vida_util_dias: 15,
    tiempo_fermentacion_minutos: 0,
    temperatura_fermentacion_c: 0,
    tiempo_horneado_minutos: 12,
    temperatura_horneado_c: 170,
    variantes: [variante('grande', 67.5), variante('mediano', 47.5), variante('pequeno', 27.5)]
  },
  {
    nombre: 'Crinkle de chocolate',
    categoria: 'Galleta',
    descripcion: 'Galleta crinkle de chocolate.',
    vida_util_dias: 15,
    tiempo_fermentacion_minutos: 0,
    temperatura_fermentacion_c: 0,
    tiempo_horneado_minutos: 12,
    temperatura_horneado_c: 170,
    variantes: [variante('grande', 67.5), variante('mediano', 47.5), variante('pequeno', 27.5)]
  }
].map((producto) => ({
  condiciones_almacenamiento: 'Conservar en un lugar fresco y seco, protegido de la luz directa y la humedad.',
  estado: 'activo',
  requiere_inmersion: false,
  tiempo_inmersion_minutos: 0,
  temperatura_inmersion_c: 0,
  ...producto
}));
