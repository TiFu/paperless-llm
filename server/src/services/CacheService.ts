import { createClient } from 'redis';
import { RedisConfig } from '../config/AppConfig.js';
import { RedisClientType } from '@redis/client';
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

type SimpleMap = { [key: string]: string}

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
    this.client = createClient({
        socket: {
          port: this.config.port,
          host: this.config.host
        },
        username: this.config.username,
        password: this.config.password,
        database: this.config.db
      })
      this.client.on("error", (err) => {
        this.logger.error(err, "Failure in redis caching");
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
        this.logger.info("REnding redis client!")
      })
      
      this.documentCache = new RedisCacheService(this.client, config.ttlInSeconds, "document", dmsSerializers.document)
      this.tagCache = new RedisCacheService(this.client, config.ttlInSeconds, "tag", dmsSerializers.tag)
      this.correspondentCache = new RedisCacheService(this.client, config.ttlInSeconds, "correspondent", dmsSerializers.correspondent)
      this.documentTypeCache = new RedisCacheService(this.client, config.ttlInSeconds, "documentType", dmsSerializers.documentType)
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async ping(): Promise<void> {
      await this.client.ping()
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
    const promises = [];
    for (let object of objects) {
      promises.push(this.cache(object.key, object.object))
    }
    return Promise.all(promises).then(() => {})
  }

  async getAll(key: string[]): Promise<(T | null)[]> {
      if (key.length == 0) 
        return [];

      this.logger.info({ keys: key }, "Keys requested in getAll")
      const results = await this.client.mGet(key) as (string | null)[]
      return results.map((r) => {
        if (!r) {
          return null;
        }
        return this.serializer.deserialize(r)
      })
  }

  async cache(keyValue: string, object: T): Promise<void> {
      const value = this.serializer.serialize(object);
      const key = this.getKey(keyValue);
      await this.client.set(key, value, { EX: this.ttlInSeconds})
  }

  async invalidate(key: string): Promise<void> {
      await this.client.del(this.getKey(key))
  }

  async get(keyValue: string): Promise<T | null> {
      const key = this.getKey(keyValue)
      const value = await this.client.get(key);
      if (!value) {
        return null
      }
      return this.serializer.deserialize(value)
  }

  private getKey(key: string): string {
    return this.namespace + "/" + key
  }
}
