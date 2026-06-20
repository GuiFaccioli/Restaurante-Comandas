<!-- RAW SOURCE — NÃO EDITAR. Capturado em 2026-06-20 via GitHub API -->
<!-- URL: https://github.com/pizzaql/next -->
<!-- Branch: master | Stars: 65 | Language: TypeScript -->

# PizzaQL/next — Repository Snapshot

## Metadata
- Description: (Work in progress) The rewritten version of the original PizzaQL
- Homepage: https://pizzaql.vercel.app
- Language: TypeScript
- Stars: 65
- Topics: a11y, app, digital-ocean, fast, graphql, hasura, i18n, new, next, nextjs, order, order-management, pizzaql, placement, react, rewritten, sql, ssg, web-app
- Created: 2020-09-26 | Updated: 2026-03-25

## README

<p align="center">
	<img src="public/images/pizzaql.svg" alt="Logo"/>
	<br/>
	<br/>
	<b>Modern order placement and management system.</b>
</div>

### Information

This is a rewritten version of the original PizzaQL. Once done, it will be moved to the original repository. Changes include a completely new design, different backend, ability to order multiple items at once, extended configuration options and much more.

### Roadmap

- [ ] Order Placement
  - [x] Fully functional cart
  - [ ] Stripe payments
  - [ ] Delivery hours calculation
  - [ ] Connection with backend
  - [ ] Performance optimizations

### Technology Stack

- React
- Next.js
- Chakra UI
- Emotion
- Recoil
- Apollo Client
- Prisma

Frontend and GraphQL server are hosted on Vercel and the PostgreSQL database on Digital Ocean.

### Sponsors

Special thanks to Digital Ocean and Sauce Labs for supporting this project!

### License

MIT

---

## File Structure

```
/
├── components/
│   └── state-saver.tsx
├── lib/
│   ├── graphql/
│   │   └── mutations.ts
│   ├── info.ts
│   ├── menu.ts
│   └── recoil-atoms.ts
├── pages/
│   ├── 404.tsx
│   ├── _app.tsx
│   ├── _document.tsx
│   └── index.tsx
├── public/
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── context.ts
│   │   ├── schema.ts
│   │   └── server.ts
│   ├── schema.graphql        ← auto-gerado pelo Nexus
│   └── package.json
├── utils/
│   ├── get-delivery-hours.ts
│   └── merge.ts
├── i18n.json
├── next.config.js
└── tsconfig.json
```

---

## lib/recoil-atoms.ts

```typescript
import {atom} from 'recoil';

export interface CartState {
	items: Array<{name: string; type: string; price: number; quantity: number}>;
	total: number;
}

export const _cart = atom<CartState>({
	key: 'theme',
	default: {
		items: [],
		total: 0
	}
});
```

---

## lib/menu.ts

```typescript
import info from './info';

const {types} = info;

const translatedIngredients = new Map([
	['Cheese', {en: 'Cheese', pl: 'Ser'}],
	['Mushrooms', {en: 'Mushrooms', pl: 'Grzyby'}],
	['Ham', {en: 'Ham', pl: 'Szynka'}],
	['Olives', {en: 'Olives', pl: 'Oliwki'}]
]);

const menu = (lang: 'en' | 'pl') => [
	{
		name: 'Margharita',
		image: 'images/covers/margharita.jpg',
		ingredients: [
			(translatedIngredients.get('Cheese') as { en: string; pl: string})[lang],
			'Oregano'
		],
		variants: [
			{type: types.small[lang], price: 19},
			{type: types.large[lang], price: 24}
		],
		thickCrustFee: 0
	},
	{
		name: 'Pepperoni',
		image: 'images/covers/pepperoni.jpg',
		ingredients: [
			(translatedIngredients.get('Cheese') as { en: string; pl: string})[lang],
			'Pepperoni',
			'Oregano'
		],
		variants: [
			{type: types.small[lang], price: 24},
			{type: types.large[lang], price: 28}
		],
		thickCrustFee: 0
	},
	{
		name: 'Quattro Formaggi',
		image: 'images/covers/quattro-formaggi.jpg',
		ingredients: ['Mozzarella', 'Gorgonzola', 'Fontina', 'Parmigiano-Reggiano'],
		variants: [
			{type: types.small[lang], price: 23},
			{type: types.large[lang], price: 27}
		],
		thickCrustFee: 0
	},
	{
		name: 'Capricciosa',
		image: 'images/covers/capricciosa.jpg',
		ingredients: [
			(translatedIngredients.get('Cheese') as {en:string;pl:string})[lang],
			(translatedIngredients.get('Mushrooms') as {en:string;pl:string})[lang],
			(translatedIngredients.get('Ham') as {en:string;pl:string})[lang],
			(translatedIngredients.get('Olives') as {en:string;pl:string})[lang]
		],
		variants: [
			{type: types.small[lang], price: 22},
			{type: types.large[lang], price: 26}
		],
		thickCrustFee: 0
	}
];

export default menu;
```

---

## lib/graphql/mutations.ts

```typescript
import {gql} from '@apollo/client';

const CREATE_ORDER = gql`
	mutation createOrder {
		insert_order(
			objects: [
				{
					cart: $cart,
					name: $name,
					email: $email,
					phone: $phone,
					company: $company,
					address: $address,
					postal: $postal,
					city: $city,
					floor: $floor,
					time: $time,
					notes: $notes,
					payment: $payment,
					tip: $string,
					status: "in progress"
				}
			]
		) {
			returning {
				id
			}
		}
	}
`;

export { CREATE_ORDER };
```

---

## server/prisma/schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Cart {
	id        Int      @default(autoincrement()) @id
	name      String
	type      String
	price     Float
	quantity  Int
	orderId   Int
}

model Order {
	id        Int      @default(autoincrement()) @id
	createdAt DateTime @default(now())
	name      String
	email     String
	phone     String
	company   String?
	address   String
	postal    String
	city      String
	floor     String?
	time      String
	notes     String?
	payment   String
	tip       String?
	total     Float
}
```

---

## server/schema.graphql (auto-gerado por Nexus)

```graphql
type Cart {
  id: ID
  name: String
  orderId: Int
  price: Float
  quantity: Int
  type: String
}

type Order {
  address: String
  city: String
  company: String
  createdAt: DateTimeField
  email: String
  floor: String
  id: ID
  name: String
  notes: String
  payment: String
  phone: String
  postal: String
  time: String
  tip: String
  total: Float
}

type Mutation {
  createCart(data: CartCreateInput!): Cart!
  createOrder(data: OrderCreateInput!): Order!
  deleteCart(where: CartWhereUniqueInput!): Cart
  deleteOrder(where: OrderWhereUniqueInput!): Order
}

type Query {
  carts(orderId: Int!): [Cart]
  order(where: OrderWhereUniqueInput!): Order
  orders(after: ..., before: ..., first: Int, last: Int): [Order!]!
}
```

---

## server/src/schema.ts (Nexus code-first)

```typescript
import { makeSchema, nonNull, objectType, intArg } from 'nexus';
import { nexusPrisma } from 'nexus-plugin-prisma';
import { dateTimePlugin } from '@jcm/nexus-plugin-datetime';

const Cart = objectType({
	name: 'Cart',
	definition(t) {
		t.id('id'); t.string('name'); t.string('type');
		t.float('price'); t.int('quantity'); t.int('orderId');
	}
});

const Order = objectType({
	name: 'Order',
	definition(t) {
		t.id('id'); t.dateTime('createdAt'); t.string('name');
		t.string('email'); t.string('phone'); t.nullable.string('company');
		t.string('address'); t.string('postal'); t.string('city');
		t.nullable.string('floor'); t.string('time'); t.nullable.string('notes');
		t.string('payment'); t.nullable.string('tip'); t.float('total');
	}
});

const Mutation = objectType({
	name: 'Mutation',
	definition(t) {
		t.crud.deleteOneOrder({alias: 'deleteOrder'});
		t.crud.createOneOrder({alias: 'createOrder'});
		t.crud.createOneCart({alias: 'createCart'});
		t.crud.deleteOneCart({alias: 'deleteCart'});
	}
});

export const schema = makeSchema({
	types: [Query, Mutation, Cart, Order],
	plugins: [nexusPrisma({experimentalCRUD: true}), dateTimePlugin()],
	outputs: {
		schema: __dirname + '/../schema.graphql',
		typegen: __dirname + '/generated/nexus.ts'
	}
});
```

---

## next.config.js

```javascript
const withTranslate = require('next-translate')
const withOptimizedImages = require('next-optimized-images');
const withOffline = require('next-offline');

const nextConfig = {
	workboxOpts: {
		swDest: 'static/service-worker.js',
		runtimeCaching: [{
			urlPattern: /^https?.*/,
			handler: 'NetworkFirst',
			options: {
				cacheName: 'https-calls',
				networkTimeoutSeconds: 15,
				expiration: { maxEntries: 150, maxAgeSeconds: 30 * 24 * 60 * 60 },
				cacheableResponse: { statuses: [0, 200] }
			}
		}]
	},
	reactStrictMode: true,
	i18n: {
		locales: ['en', 'pl'],
		defaultLocale: 'en',
	}
};

module.exports = withTranslate(withOptimizedImages(withOffline(nextConfig)));
```

---

## package.json (deps relevantes)

```json
{
  "name": "pizzaql",
  "version": "1.0.0",
  "engines": { "node": "12.x" },
  "dependencies": {
    "next": "10.x",
    "react": "17.x",
    "@chakra-ui/react": "next",
    "@apollo/client": "...",
    "recoil": "...",
    "react-hook-form": "...",
    "next-translate": "...",
    "next-optimized-images": "...",
    "next-offline": "...",
    "framer-motion": "...",
    "date-fns": "..."
  }
}
```
