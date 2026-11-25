# Monvera — Small Business Enterprise Management System

An editorial-inspired full-stack **MERN** (MongoDB, Express.js, React, Node.js) business management platform for small business owners to manage products, orders, customer records, and revenue performance.

## Core Modules

1. **Dashboard** (`/`) — Live business statistics (`Total Revenue`, `Total Orders`, `Total Products`, `Total Customers`), interactive Daily / Weekly / Monthly revenue performance chart, recent orders ledger, low-stock alerts, and top-selling products ranked by units sold.
2. **Products** (`/products`) — Visual Catalog & Table views, image file upload, search, category filtering, price/name/date sorting, low-stock highlights, pagination, and order-history archival protection.
3. **Orders** (`/orders`) — Order ledger with status tabs (`Pending`, `Processing`, `Completed`, `Cancelled`), search & date range filters, multi-line order creation/editing, historical product price snapshots, and atomic inventory synchronization.
4. **Customers** (`/customers`) — Customer directory with search, duplicate-email protection, and a Customer Profile Dossier displaying dynamically calculated order counts, lifetime purchase totals, and full order history.

## Project Structure

```
├── backend/
│   ├── config/db.ts                  # MongoDB connection & transaction detection
│   ├── controllers/                  # RESTful route controllers
│   ├── middleware/                   # Validation & centralized error handling
│   ├── models/                       # Mongoose schemas (Product, Customer, Order)
│   ├── routes/                       # Express API routers
│   ├── services/                     # Business logic, inventory rules & seed service
│   ├── app.ts                        # Express API application & Multer upload setup
│   └── server.ts                     # Standalone backend entry point
├── frontend/
│   └── src/
│       ├── components/               # Reusable UI, Navigation, Header, Modals, Forms
│       ├── hooks/                    # Toast notifications & debounce hooks
│       ├── layouts/                  # Main editorial shell layout
│       ├── pages/                    # Dashboard, Products, Orders, Customers
│       ├── services/                 # Axios API client
│       ├── styles/                   # Tailwind v4 & CSS brand tokens
│       ├── types/                    # TypeScript interfaces
│       ├── utils/                    # Currency & date formatters
│       ├── App.tsx
│       └── main.tsx
├── server.ts                         # Unified Express + Vite server (port 3000)
├── index.html
└── package.json
```

## Local Setup & Running

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env` and set your MongoDB connection string:
   ```env
   PORT=3000
   MONGODB_URI="mongodb://127.0.0.1:27017/verdant_ledger"
   SEED_INITIAL_DATA="true"
   ```
   *(If `MONGODB_URI` is omitted or unreachable during local preview, the backend automatically persists documents to `.data/verdant_ledger.json` with identical validation and inventory rules.)*

3. **Run in development mode**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Build and run in production**
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

## REST API Endpoints

- **Products**: `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`
- **Customers**: `GET /api/customers`, `GET /api/customers/:id`, `POST /api/customers`, `PUT /api/customers/:id`, `DELETE /api/customers/:id`
- **Orders**: `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders`, `PUT /api/orders/:id`, `DELETE /api/orders/:id`
- **Dashboard**: `GET /api/dashboard/stats`, `GET /api/dashboard/sales?period=daily|weekly|monthly`, `GET /api/dashboard/recent-orders`, `GET /api/dashboard/top-products`
- **Upload**: `POST /api/upload`
