import { createClient } from 'redis';
import { RedisConfig } from '../config/AppConfig.js';
import { IDocument } from '../domain/document/IDocument.js';
import { ICorrespondent, IDocumentType, ITag } from '../domain/document/IDocumentEntities.js';
import { createChildLogger } from '../utils/logger.js';
import pino from 'pino';

export interface Serializer<T> {
  serialize(t: T): string
  deserialize(s: string): T
}

export interface CacheService<T> {
  get(key: string): Promise<T | null>;
  cache(key: string, object: T): Promise<void>;
  cacheAll(objects: Array<{ key: string, object: T}>): Promise<void>;
  getAll(key: string[]): Promise<(T | null)[]>;
  invalidate(key: string): Promise<void>;
}

export interface IDMSSerializer {
  document: Serializer<IDocument>;
  tag: Serializer<ITag>;
  correspondent: Serializer<ICorrespondent>;
  documentType: Serializer<IDocumentType>;
}

 class JsonSerializer<T> implements Serializer<T> {
  serialize(t: T): string {
      return JSON.stringify(t);
  }

  // TODO: properly handle dates...
  deserialize(s: string): T {
      return JSON.parse(s) as T;
  }
}

class DocumentSerializer implements Serializer<IDocument> {
  constructor(private serializer: JsonSerializer<IDocument>) {

  }
  serialize(t: IDocument): string {
      return this.serializer.serialize(t)
  }

  deserialize(s: string): IDocument {
      const deserialized = this.serializer.deserialize(s)
      deserialized.createdDate = deserialized.createdDate ? new Date(deserialized.createdDate) : null;
      deserialized.modifiedDate = deserialized.modifiedDate ? new Date(deserialized.modifiedDate) : null;
      return deserialized
    }
}

export const DMSSerializers = {
  document: new DocumentSerializer(new JsonSerializer<IDocument>()),
  tag: new JsonSerializer<ITag>(),
  correspondent: new JsonSerializer<ICorrespondent>(),
  documentType: new JsonSerializer<IDocumentType>()
}

export class DMSCacheService {
  readonly documentCache: CacheService<IDocument>;
  readonly tagCache: CacheService<ITag>;
  readonly correspondentCache: CacheService<ICorrespondent>
  readonly documentTypeCache: CacheService<IDocumentType>;
  readonly client: ReturnType<typeof createClient>;
  private readonly logger: pino.Logger;

  constructor(private readonly config: RedisConfig, dmsSerializers: IDMSSerializer) {
    this.logger = createChildLogger({ name: "DMSCacheService"})
    const baseDelayMs = config.reconnectBaseDelayMs ?? 500;
    const maxDelayMs = config.reconnectMaxDelayMs ?? 30000;
    this.client = createClient({
        socket: {
          port: this.config.port,
          host: this.config.host,
          // Unlimited retries with exponential backoff capped at maxDelayMs.
          // Returning a number (never false/Error) means the client keeps
          // retrying forever instead of giving up.
          reconnectStrategy: (retries: number) => Math.min(baseDelayMs * 2 ** retries, maxDelayMs),
        },
        username: this.config.username,
        password: this.config.password,
        database: this.config.db
      })
      this.client.on("error", (err) => {
        this.logger.warn({ err }, "Redis cache unavailable, falling back to pass-through");
      })
      this.client.on("connect", () => {
        this.logger.info("Connected to redis!")
      })
      this.client.on("ready", () => {
        this.logger.info("Ready to serve redis requests!")
      })
      this.client.on("reconnecting", () => {
        this.logger.info("Reconnecting to redis!")
      })
      this.client.on("end", () => {
        this.logger.info("Redis client connection ended!")
      })

      this.documentCache = new RedisCacheService(this.client, config.ttlInSeconds, "document", dmsSerializers.document)
      this.tagCache = new RedisCacheService(this.client, config.ttlInSeconds, "tag", dmsSerializers.tag)
      this.correspondentCache = new RedisCacheService(this.client, config.ttlInSeconds, "correspondent", dmsSerializers.correspondent)
      this.documentTypeCache = new RedisCacheService(this.client, config.ttlInSeconds, "documentType", dmsSerializers.documentType)
  }

  /**
   * Kicks off the initial connection attempt. Never throws: the client's
   * reconnectStrategy retries forever in the background, so a Redis outage
   * at startup just means cache calls pass through until it comes back.
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (err) {
      this.logger.warn({ err }, "Initial Redis connection failed, retrying in the background");
    }
  }

  isAvailable(): boolean {
    return this.client.isReady;
  }

  async ping(): Promise<boolean> {
    if (!this.client.isReady) {
      return false;
    }
    try {
      await this.client.ping()
      return true;
    } catch (err) {
      this.logger.warn({ err }, "Redis ping failed");
      return false;
    }
  }

}

export class RedisCacheService<T> implements CacheService<T> {

  private logger: pino.Logger

  constructor(private readonly client: ReturnType<typeof createClient>, private readonly ttlInSeconds: number, private readonly namespace: string, private serializer: Serializer<T>) {
    this.logger = createChildLogger({ name: "RedisCacheService/" + this.namespace })
  }


  async cacheAll(objects: Array<{ key: string; object: T; }>): Promise<void> {
    if (objects.length == 0)
      return;
    if (!this.client.isReady) {
      return;
    }
    const promises = [];
    for (const object of objects) {
      promises.push(this.cache(object.key, object.object))
    }
    this.logger.info({ keys: objects.map(a => a.key)}, "Cached objects")
    return Promise.all(promises).then(() => {})
  }

  async getAll(key: string[]): Promise<(T | null)[]> {
      if (key.length == 0)
        return [];
      if (!this.client.isReady) {
        return key.map(() => null);
      }

      const namespacedKeys = key.map((k) => this.getKey(k));
      try {
        this.logger.info({ keys: namespacedKeys }, "Keys requested in getAll")
        const results = await this.client.mGet(namespacedKeys) as (string | null)[]
        this.logger.info({ keys: namespacedKeys, results}, "Hit cached objects")
        return results.map((r) => {
          if (!r) {
            return null;
          }
          return this.serializer.deserialize(r)
        })
      } catch (err) {
        this.logger.warn({ err, keys: namespacedKeys }, "Cache getAll failed, falling back to pass-through");
        return key.map(() => null);
      }
  }

  async cache(keyValue: string, object: T): Promise<void> {
      if (!this.client.isReady) {
        return;
      }
      try {
        const value = this.serializer.serialize(object);
        const key = this.getKey(keyValue);
        await this.client.set(key, value, { EX: this.ttlInSeconds})
      } catch (err) {
        this.logger.warn({ err, key: keyValue }, "Cache write failed, falling back to pass-through");
      }
  }

  async invalidate(key: string): Promise<void> {
      if (!this.client.isReady) {
        return;
      }
      try {
        await this.client.del(this.getKey(key))
      } catch (err) {
        this.logger.warn({ err, key }, "Cache invalidate failed, falling back to pass-through");
      }
  }

  async get(keyValue: string): Promise<T | null> {
      if (!this.client.isReady) {
        return null;
      }
      try {
        const key = this.getKey(keyValue)
        const value = await this.client.get(key);
        if (!value) {
          return null
        }
        return this.serializer.deserialize(value)
      } catch (err) {
        this.logger.warn({ err, key: keyValue }, "Cache read failed, falling back to pass-through");
        return null;
      }
  }

  private getKey(key: string): string {
    return this.namespace + "/" + key
  }
}
