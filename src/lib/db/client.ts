import { MongoClient, type Db } from "mongodb";

/**
 * Singleton MongoClient. In development the client is cached on globalThis so
 * Next.js hot-reload doesn't open a new connection on every change.
 */
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
 * Cache the client on globalThis in every environment. Serverless instances are
 * frozen between invocations and reused, so a module-scoped client would be
 * rebuilt on each cold start while a cached one is reused across invocations.
 */
if (!global._mongoClientPromise) {
  global._mongoClientPromise = new MongoClient(uri, options).connect();
}
const clientPromise: Promise<MongoClient> = global._mongoClientPromise;

export async function getClient(): Promise<MongoClient> {
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}
