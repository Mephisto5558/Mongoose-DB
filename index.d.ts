import type { Collection } from '@discordjs/collection';
import type { Document, Model, Types } from 'mongoose';

export { DB, NoCacheDB };
export default DB;

declare class NoCacheDB {
  schema: Model<Document<unknown, Record<string, never>, {
    _id: Types.ObjectId;
    key: string;
    value?: unknown;
  }>>;

  valueLoggingMaxJSONLength: number;

  /**
   * @param dbConnectionString MongoDB connection string
   * @param valueLoggingMaxJSONLength default:`20`, `false` to disable value logging
   * @param debugLoggingFunction default: `console.debug` */
  init(dbConnectionString: string, collection?: string, valueLoggingMaxJSONLength?: number | false, debugLoggingFunction?: (...str: unknown[]) => unknown): Promise<this>;

  saveLog(msg: string, value?: unknown): this;
  reduce(): Promise<{ key: string; value: unknown }[]>;

  get(): Promise<undefined>;
  get(db: string, key?: string): Promise<unknown>;

  /** @param overwrite overwrite existing collection, default: `false` */
  set(db: string, value: unknown, overwrite?: boolean): Promise<unknown>;
  update(db: string, key: string, value: unknown): Promise<unknown>;
  push(db: string, key: string, ...value: unknown[]): Promise<unknown>;
  pushToSet(db: string, key: string, ...value: unknown[]): Promise<unknown>;

  /**
   * @param key if not provided, the whole `db` gets deleted
   * @returns `true` if the element existed */
  delete(db: string, key?: string): Promise<boolean>;

  valueOf(): string;
}

declare class DB extends NoCacheDB {
  /** The cache will be updated automatically */
  cache: Collection<string, unknown>;

  fetchAll(this: DB): Promise<this>;
  fetch(this: DB, db: string): Promise<unknown>;

  // @ts-expect-error Promiseless method
  reduce(this: DB): { key: string; value: unknown }[];

  // @ts-expect-error Promiseless method
  get(this: DB): undefined;

  // @ts-expect-error Promiseless method
  get(this: DB, db: string, key?: string): unknown;

  /** @param overwrite overwrite existing collection, default: `false` */
  set(this: DB, db: string, value: unknown, overwrite?: boolean): Promise<unknown>;

  update(this: DB, db: string, key: string, value: unknown): Promise<unknown>;
  push(this: DB, db: string, key: string, ...value: unknown[]): Promise<unknown>;
  pushToSet(this: DB, db: string, key: string, ...value: unknown[]): Promise<unknown>;

  /**
   * @inheritdoc
   * @returns `true` if the element existed or the key param is provied and `false` if the element did not exist */
  delete(this: DB, db: string, key?: string): Promise<boolean>;
}