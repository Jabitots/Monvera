import { getDatabaseState } from '../config/db.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { ensureDefaultUser } from './authService.js';
import {
  generateObjectId,
  readLocalStore,
  writeLocalStore,
  LocalProduct,
  LocalCustomer,
  LocalOrder,
} from './localStore.js';

const daysAgo = (days: number, hourOffset = 10): Date => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hourOffset, 15, 0, 0);
  return d;
};

const SEED_PRODUCTS = [
  {
    productName: 'Speckled Stoneware Carafe',
    description:
      'Hand-thrown stoneware water carafe finished in a matte warm sand mineral glaze. Fired in small batches for dining and bedside service.',
    category: 'Ceramics',
    price: 94.0,
    stockQuantity: 18,
    image: '/src/assets/images/product_stoneware_carafe_1794584332131.jpg',
  },
  {
    productName: 'Belgian Sage Linen Throw',
    description:
      'Heavyweight stonewashed Belgian flax throw woven in alternating muted sage green and raw cream stripes with hand-knotted fringe.',
    category: 'Textiles',
    price: 168.0,
    stockQuantity: 4,
    image: '/src/assets/images/product_linen_throw_1794584333371.jpg',
  },
  {
    productName: 'Forest Cedar & Moss Candle',
    description:
      'Hand-poured soy and beeswax apothecary candle infused with atlas cedarwood, crushed moss, and vetiver in a frosted forest glass vessel.',
    category: 'Apothecary',
    price: 58.0,
    stockQuantity: 29,
    image: '/src/assets/images/product_botanical_candle_1794584332966.jpg',
  },
  {
    productName: 'Walnut & Brass Serving Tray',
    description:
      'Solid American black walnut valet and tea tray joined with mitered splines and custom brushed solid brass handles.',
    category: 'Woodcraft',
    price: 215.0,
    stockQuantity: 3,
    image: '/src/assets/images/product_walnut_tray_1794584333560.jpg',
  },
  {
    productName: 'Botanical Cedar Hand Balm',
    description:
      'Cold-pressed botanical hand and cuticle balm crafted with organic shea, sweet almond, French lavender, and cedar essential oils.',
    category: 'Apothecary',
    price: 42.0,
    stockQuantity: 34,
    image: '/src/assets/images/product_botanical_balm_1794584334095.jpg',
  },
  {
    productName: 'Unglazed Clay Vessel',
    description:
      'Sculptural wheel-thrown amphora vase in raw cream grogged clay designed for dried botanicals and architectural stems.',
    category: 'Ceramics',
    price: 128.0,
    stockQuantity: 11,
    image: '/src/assets/images/product_ceramic_vase_1794584334129.jpg',
  },
];

// Internationally diverse customer roster (USA, UK, Japan, Germany, France, Canada, Australia,
// South Korea, China, India, Italy, Brazil, Philippines, Nigeria, Mexico)
const SEED_CUSTOMERS = [
  {
    fullName: 'Hannah Brooks',
    email: 'hannah.brooks@brooksgallery.us',
    contactNumber: '+1 (415) 891-2409',
    address: '742 Sutter Street, Suite 4B, San Francisco, CA 94109, USA',
  },
  {
    fullName: 'Oliver Bennett',
    email: 'oliver.bennett@bennettstudio.co.uk',
    contactNumber: '+44 20 7946 0821',
    address: '14 Redchurch Street, Shoreditch, London E2 7DP, UK',
  },
  {
    fullName: 'Haruka Takahashi',
    email: 'haruka.takahashi@kurokawahome.jp',
    contactNumber: '+81 3-5555-0194',
    address: '3-14-8 Minami-Aoyama, Minato-ku, Tokyo 107-0062, Japan',
  },
  {
    fullName: 'Lukas Weber',
    email: 'lukas.weber@weberarchitektur.de',
    contactNumber: '+49 30 90182042',
    address: 'Torstraße 112, 10119 Berlin, Germany',
  },
  {
    fullName: 'Camille Laurent',
    email: 'camille.laurent@maisonlaurent.fr',
    contactNumber: '+33 1 42 68 55 10',
    address: '28 Rue de Turenne, 75003 Paris, France',
  },
  {
    fullName: 'Liam Tremblay',
    email: 'liam.tremblay@nordatelier.ca',
    contactNumber: '+1 (514) 555-0183',
    address: '460 Rue Sainte-Catherine Ouest, Montréal, QC H3B 1A7, Canada',
  },
  {
    fullName: 'Chloe Gallagher',
    email: 'chloe.gallagher@harbourdesign.com.au',
    contactNumber: '+61 2 9012 4480',
    address: '88 Crown Street, Surry Hills NSW 2010, Australia',
  },
  {
    fullName: 'Min-jun Park',
    email: 'minjun.park@seoulobjects.kr',
    contactNumber: '+82 2-312-7745',
    address: '45 Samcheong-ro, Jongno-gu, Seoul 03053, South Korea',
  },
  {
    fullName: 'Mei-Ling Chen',
    email: 'meiling.chen@jianganstudio.cn',
    contactNumber: '+86 21 6329 4412',
    address: '185 Anfu Road, Xuhui District, Shanghai 200031, China',
  },
  {
    fullName: 'Aarav Kulkarni',
    email: 'aarav.kulkarni@kulkarnicraft.in',
    contactNumber: '+91 22 2640 8831',
    address: '12 Pali Hill Road, Bandra West, Mumbai 400050, India',
  },
  {
    fullName: 'Giulia Conti',
    email: 'giulia.conti@conticeramica.it',
    contactNumber: '+39 02 8940 3155',
    address: 'Via Brera 24, 20121 Milano MI, Italy',
  },
  {
    fullName: 'Mateus Oliveira',
    email: 'mateus.oliveira@oliveiraespaco.com.br',
    contactNumber: '+55 11 3082-7740',
    address: 'Rua Oscar Freire 910, Jardins, São Paulo - SP 01426-002, Brazil',
  },
  {
    fullName: 'Isabel Santos',
    email: 'isabel.santos@santosatelier.ph',
    contactNumber: '+63 2 8815 4920',
    address: '108 Legazpi Street, Makati City 1229, Metro Manila, Philippines',
  },
  {
    fullName: 'Chinedu Okafor',
    email: 'chinedu.okafor@okaforinteriors.ng',
    contactNumber: '+234 1 453 9021',
    address: '22 Adeola Odeku Street, Victoria Island, Lagos, Nigeria',
  },
  {
    fullName: 'Valeria Mendoza',
    email: 'valeria.mendoza@tallermendoza.mx',
    contactNumber: '+52 55 5207 6618',
    address: 'Calle Colima 168, Roma Norte, 06700 Ciudad de México, Mexico',
  },
];

// Mapping from legacy initial seed emails to updated diverse records (preserving _id and order links)
const LEGACY_EMAIL_UPDATES: Record<string, (typeof SEED_CUSTOMERS)[number]> = {
  'clara.moreau@ateliermoreau.com': SEED_CUSTOMERS[0],
  'j.mercer@mercerarchitects.co': SEED_CUSTOMERS[1],
  'sora@kurokawahome.jp': SEED_CUSTOMERS[2],
  'henrik@nordicresidence.se': SEED_CUSTOMERS[3],
  'amelie@maisonlaurent.fr': SEED_CUSTOMERS[4],
};

const PLACEHOLDER_NAME_REGEX = /^(john doe|jane doe|test user|customer\s*\d*|user\s*\d*)$/i;

const syncDiverseCustomersInExistingStore = async (): Promise<void> => {
  const { mode } = getDatabaseState();

  if (mode === 'mongodb') {
    const existingCustomers = await Customer.find().sort({ createdAt: 1 });
    if (existingCustomers.length === 0) return;

    const existingEmails = new Set(
      existingCustomers.map((c) => c.email.toLowerCase())
    );
    let updatedCount = 0;

    // 1. Update legacy seeded or placeholder records in-place (preserving _id and order references)
    let fallbackIdx = 0;
    for (const doc of existingCustomers) {
      const legacyReplacement = LEGACY_EMAIL_UPDATES[doc.email.toLowerCase()];
      let replacement = legacyReplacement;

      if (!replacement && PLACEHOLDER_NAME_REGEX.test(doc.fullName.trim())) {
        while (
          fallbackIdx < SEED_CUSTOMERS.length &&
          existingEmails.has(SEED_CUSTOMERS[fallbackIdx].email.toLowerCase())
        ) {
          fallbackIdx++;
        }
        if (fallbackIdx < SEED_CUSTOMERS.length) {
          replacement = SEED_CUSTOMERS[fallbackIdx++];
        }
      }

      if (replacement) {
        const targetEmail = replacement.email.toLowerCase();
        const emailTakenByAnother = existingCustomers.some(
          (other) =>
            String(other._id) !== String(doc._id) &&
            other.email.toLowerCase() === targetEmail
        );
        doc.fullName = replacement.fullName;
        if (!emailTakenByAnother) {
          existingEmails.delete(doc.email.toLowerCase());
          doc.email = targetEmail;
          existingEmails.add(targetEmail);
        }
        doc.contactNumber = replacement.contactNumber;
        doc.address = replacement.address;
        await doc.save();
        updatedCount++;
      }
    }

    // 2. Ensure the international roster exists without duplicating any customer email
    let insertedCount = 0;
    const shouldBackfillRoster = updatedCount > 0 || existingCustomers.length <= 5;
    if (shouldBackfillRoster) {
      for (const seedCust of SEED_CUSTOMERS) {
        const targetEmail = seedCust.email.toLowerCase();
        if (!existingEmails.has(targetEmail)) {
          await Customer.create(seedCust);
          existingEmails.add(targetEmail);
          insertedCount++;
        }
      }
    }

    if (updatedCount > 0 || insertedCount > 0) {
      console.log(
        `[Seed] Synchronized international customer names in MongoDB (${updatedCount} updated, ${insertedCount} added).`
      );
    }
    return;
  }

  // Local persistent store migration
  const store = readLocalStore();
  if (!store.initialized || store.customersMigratedV2) return;

  const existingEmails = new Set(
    store.customers.map((c) => c.email.toLowerCase())
  );
  const nowIso = new Date().toISOString();
  let updatedCount = 0;
  let fallbackIdx = 0;

  for (const cust of store.customers) {
    const legacyReplacement = LEGACY_EMAIL_UPDATES[cust.email.toLowerCase()];
    let replacement = legacyReplacement;

    if (!replacement && PLACEHOLDER_NAME_REGEX.test(cust.fullName.trim())) {
      while (
        fallbackIdx < SEED_CUSTOMERS.length &&
        existingEmails.has(SEED_CUSTOMERS[fallbackIdx].email.toLowerCase())
      ) {
        fallbackIdx++;
      }
      if (fallbackIdx < SEED_CUSTOMERS.length) {
        replacement = SEED_CUSTOMERS[fallbackIdx++];
      }
    }

    if (replacement) {
      const targetEmail = replacement.email.toLowerCase();
      const emailTakenByAnother = store.customers.some(
        (other) =>
          other._id !== cust._id && other.email.toLowerCase() === targetEmail
      );
      cust.fullName = replacement.fullName;
      if (!emailTakenByAnother) {
        existingEmails.delete(cust.email.toLowerCase());
        cust.email = targetEmail;
        existingEmails.add(targetEmail);
      }
      cust.contactNumber = replacement.contactNumber;
      cust.address = replacement.address;
      cust.updatedAt = nowIso;
      updatedCount++;
    }
  }

  let insertedCount = 0;
  for (let idx = 0; idx < SEED_CUSTOMERS.length; idx++) {
    const seedCust = SEED_CUSTOMERS[idx];
    const targetEmail = seedCust.email.toLowerCase();
    if (!existingEmails.has(targetEmail)) {
      const dt = daysAgo(50 - idx * 3).toISOString();
      store.customers.push({
        _id: generateObjectId(),
        ...seedCust,
        isArchived: false,
        createdAt: dt,
        updatedAt: nowIso,
      });
      existingEmails.add(targetEmail);
      insertedCount++;
    }
  }

  store.customersMigratedV2 = true;
  writeLocalStore(store);

  if (updatedCount > 0 || insertedCount > 0) {
    console.log(
      `[Seed] Synchronized international customer names in local store (${updatedCount} updated, ${insertedCount} added).`
    );
  }
};

export const seedInitialDataIfEmpty = async (): Promise<void> => {
  if (process.env.SEED_INITIAL_DATA !== 'true') return;
  await ensureDefaultUser();
  const { mode } = getDatabaseState();

  if (mode === 'mongodb') {
    const [pCount, cCount, oCount] = await Promise.all([
      Product.countDocuments(),
      Customer.countDocuments(),
      Order.countDocuments(),
    ]);
    if (pCount > 0 || cCount > 0 || oCount > 0) {
      return;
    }

    const products = await Product.insertMany(SEED_PRODUCTS);
    const customers = await Customer.insertMany(SEED_CUSTOMERS);

    const buildOrder = (
      num: number,
      custIdx: number,
      items: Array<{ prodIdx: number; qty: number }>,
      status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled',
      daysBack: number
    ) => {
      const orderItems = items.map(({ prodIdx, qty }) => {
        const p = products[prodIdx];
        return {
          productId: p._id,
          productName: p.productName,
          quantity: qty,
          unitPrice: p.price,
          subtotal: Number((p.price * qty).toFixed(2)),
        };
      });
      const totalAmount = Number(
        orderItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
      );
      const dt = daysAgo(daysBack, 9 + (num % 8));
      return {
        orderNumber: `ORD-2026-${String(num).padStart(4, '0')}`,
        customerId: customers[custIdx]._id,
        orderItems,
        totalAmount,
        status,
        stockDeducted: status !== 'Cancelled',
        orderDate: dt,
        notes: status === 'Pending' ? 'Gift wrapping requested in linen cloth.' : '',
        createdAt: dt,
        updatedAt: dt,
      };
    };

    const seedOrders = [
      buildOrder(101, 0, [{ prodIdx: 0, qty: 2 }, { prodIdx: 2, qty: 3 }], 'Completed', 46),
      buildOrder(102, 1, [{ prodIdx: 3, qty: 1 }, { prodIdx: 1, qty: 2 }], 'Completed', 32),
      buildOrder(103, 2, [{ prodIdx: 5, qty: 2 }, { prodIdx: 4, qty: 4 }], 'Completed', 19),
      buildOrder(104, 3, [{ prodIdx: 1, qty: 1 }, { prodIdx: 2, qty: 2 }], 'Completed', 11),
      buildOrder(105, 4, [{ prodIdx: 0, qty: 3 }, { prodIdx: 5, qty: 1 }], 'Completed', 6),
      buildOrder(106, 5, [{ prodIdx: 3, qty: 2 }, { prodIdx: 4, qty: 2 }], 'Processing', 3),
      buildOrder(107, 7, [{ prodIdx: 2, qty: 4 }, { prodIdx: 0, qty: 1 }], 'Completed', 1),
      buildOrder(108, 10, [{ prodIdx: 5, qty: 2 }, { prodIdx: 1, qty: 1 }], 'Pending', 0),
    ];

    await Order.insertMany(seedOrders);
    console.log('[Seed] Initialized MongoDB with curated artisan catalog & international customers.');
    return;
  }

  // Local store seed (runs once when initialized === false)
  const store = readLocalStore();
  if (store.initialized) {
    return;
  }

  const nowIso = new Date().toISOString();
  const products: LocalProduct[] = SEED_PRODUCTS.map((p, idx) => {
    const dt = daysAgo(60 - idx * 5).toISOString();
    return {
      _id: generateObjectId(),
      ...p,
      isArchived: false,
      createdAt: dt,
      updatedAt: nowIso,
    };
  });

  const customers: LocalCustomer[] = SEED_CUSTOMERS.map((c, idx) => {
    const dt = daysAgo(55 - idx * 3).toISOString();
    return {
      _id: generateObjectId(),
      ...c,
      isArchived: false,
      createdAt: dt,
      updatedAt: nowIso,
    };
  });

  const makeLocalOrder = (
    num: number,
    custIdx: number,
    items: Array<{ prodIdx: number; qty: number }>,
    status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled',
    daysBack: number
  ): LocalOrder => {
    const orderItems = items.map(({ prodIdx, qty }) => {
      const p = products[prodIdx];
      return {
        productId: p._id,
        productName: p.productName,
        quantity: qty,
        unitPrice: p.price,
        subtotal: Number((p.price * qty).toFixed(2)),
      };
    });
    const totalAmount = Number(
      orderItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
    );
    const dt = daysAgo(daysBack, 9 + (num % 8)).toISOString();
    return {
      _id: generateObjectId(),
      orderNumber: `ORD-2026-${String(num).padStart(4, '0')}`,
      customerId: customers[custIdx]._id,
      orderItems,
      totalAmount,
      status,
      stockDeducted: status !== 'Cancelled',
      orderDate: dt,
      notes: status === 'Pending' ? 'Gift wrapping requested in linen cloth.' : '',
      createdAt: dt,
      updatedAt: dt,
    };
  };

  const orders: LocalOrder[] = [
    makeLocalOrder(101, 0, [{ prodIdx: 0, qty: 2 }, { prodIdx: 2, qty: 3 }], 'Completed', 46),
    makeLocalOrder(102, 1, [{ prodIdx: 3, qty: 1 }, { prodIdx: 1, qty: 2 }], 'Completed', 32),
    makeLocalOrder(103, 2, [{ prodIdx: 5, qty: 2 }, { prodIdx: 4, qty: 4 }], 'Completed', 19),
    makeLocalOrder(104, 3, [{ prodIdx: 1, qty: 1 }, { prodIdx: 2, qty: 2 }], 'Completed', 11),
    makeLocalOrder(105, 4, [{ prodIdx: 0, qty: 3 }, { prodIdx: 5, qty: 1 }], 'Completed', 6),
    makeLocalOrder(106, 5, [{ prodIdx: 3, qty: 2 }, { prodIdx: 4, qty: 2 }], 'Processing', 3),
    makeLocalOrder(107, 7, [{ prodIdx: 2, qty: 4 }, { prodIdx: 0, qty: 1 }], 'Completed', 1),
    makeLocalOrder(108, 10, [{ prodIdx: 5, qty: 2 }, { prodIdx: 1, qty: 1 }], 'Pending', 0),
  ];

  writeLocalStore({
    initialized: true,
    customersMigratedV2: true,
    orderCounter: 108,
    products,
    customers,
    orders,
    users: store.users,
  });
  console.log('[Seed] Initialized local persistent store with curated artisan catalog & international customers.');
};
