export type DefaultMenuProduct = {
  nome: string
  descricao: string
  preco: string
  imagemUrl: string
}

export type DefaultMenuCategory = {
  nome: string
  ordem: number
  produtos: DefaultMenuProduct[]
}

export const DEFAULT_MENU_CATEGORIES: DefaultMenuCategory[] = [
  {
    nome: 'Cozinha',
    ordem: 0,
    produtos: [
      {
        nome: 'Lasanha Bolonhesa',
        descricao: 'Massa fresca, molho bolonhesa e queijo gratinado',
        preco: '39.90',
        imagemUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&q=80',
      },
      {
        nome: 'Parmegiana de Frango',
        descricao: 'Filé de frango empanado com molho de tomate, queijo e arroz',
        preco: '42.90',
        imagemUrl: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&q=80',
      },
      {
        nome: 'Batata Frita',
        descricao: 'Porção crocante de batata frita',
        preco: '24.90',
        imagemUrl: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=400&q=80',
      },
    ],
  },
  {
    nome: 'Pizzas',
    ordem: 1,
    produtos: [
      {
        nome: 'Margherita',
        descricao: 'Molho de tomate, mussarela fresca e manjericão',
        preco: '38.90',
        imagemUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80',
      },
      {
        nome: 'Pepperoni',
        descricao: 'Molho de tomate, mussarela e pepperoni',
        preco: '44.90',
        imagemUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80',
      },
      {
        nome: 'Quatro Queijos',
        descricao: 'Mussarela, parmesão, gorgonzola e provolone',
        preco: '46.90',
        imagemUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
      },
    ],
  },
  {
    nome: 'Bebidas',
    ordem: 2,
    produtos: [
      {
        nome: 'Coca-Cola 350ml',
        descricao: 'Refrigerante gelado',
        preco: '6.00',
        imagemUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80',
      },
      {
        nome: 'Água com gás',
        descricao: 'Água mineral com gás 500ml',
        preco: '4.00',
        imagemUrl: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400&q=80',
      },
      {
        nome: 'Suco de laranja',
        descricao: 'Suco natural espremido na hora',
        preco: '8.00',
        imagemUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80',
      },
    ],
  },
]
