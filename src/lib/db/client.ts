import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB ?? "caliber";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Serverless-safe connection options. Each warm function instance keeps its own
 * pool, and instances scale out independently, so cap the pool to stay well
 * under the cluster's connection limit. Fail fast rather than letting a request
 * hang for the driver's 30s default when the cluster is unreachable.
 */
const options = {
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 45000,
  maxIdleTimeMS: 60000,
  retryWrites: true,
};

/**
 * Connect lazily and cache the promise on globalThis so warm serverless
 * instances (and Next.js hot reload) reuse one pool.
 *
 * Two rules learned in production:
 * - Never connect at module load. A rejection there is an unhandled promise
 *   rejection, which kills the whole lambda process (exit 128).
 * - Never leave a rejected promise in the cache. A slow cluster (free-tier
 *   Atlas waking up) would otherwise poison the instance for the rest of its
 *   life, failing every request instantly.
 */
function connect(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options)
      .connect()
      .catch((error) => {
        global._mongoClientPromise = undefined;
        throw error;
      });
  }
  return global._mongoClientPromise;
}

export async function getClient(): Promise<MongoClient> {
  try {
    return await connect();
  } catch {
    // One immediate retry: the first attempt commonly times out while a
    // paused/cold cluster spins up, and by now it's usually ready.
    return connect();
  }
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}
