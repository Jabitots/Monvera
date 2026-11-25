import mongoose from 'mongoose';

export type DatabaseMode = 'mongodb' | 'local-store';

interface DbState {
  mode: DatabaseMode;
  supportsTransactions: boolean;
  uri?: string;
}

const state: DbState = {
  mode: 'local-store',
  supportsTransactions: false,
};

export const getDatabaseState = (): DbState => ({ ...state });

export const connectDB = async (): Promise<DbState> => {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    if (process.env.LOCAL_STORE === 'true' && process.env.NODE_ENV !== 'production') {
      state.mode = 'local-store';
      state.supportsTransactions = false;
      console.warn('[DB] Explicit LOCAL_STORE=true enabled; using .data JSON storage.');
      return state;
    }
    throw new Error('MONGODB_URI is required. Set LOCAL_STORE=true only for explicit non-production local development.');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });

    state.mode = 'mongodb';
    state.uri = undefined;

    // Detect if connected MongoDB topology supports replica set transactions
    try {
      const admin = mongoose.connection.db?.admin();
      const hello = await admin?.command({ hello: 1 });
      state.supportsTransactions = Boolean(hello?.setName || hello?.msg === 'isdbgrid');
    } catch {
      state.supportsTransactions = false;
    }

    console.log(
      `[DB] Connected to MongoDB (${state.supportsTransactions ? 'transactions enabled' : 'standalone mode'}).`
    );
    return state;
  } catch {
    state.mode = 'mongodb';
    state.supportsTransactions = false;
    throw new Error('MongoDB connection failed. Verify MONGODB_URI, Atlas network access, and database user permissions.');
  }
};
