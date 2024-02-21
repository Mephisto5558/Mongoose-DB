import { Collection } from '@discordjs/collection';
import { Document, Model, Types } from 'mongoose';

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
   * @param debugLoggingFunction default: `console.debug`*/
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  init(dbConnectionString: string, collection?: string, valueLoggingMaxJSONLength?: number | false, debugLoggingFunction?: (...str: any[]) => unknown): Promise<this>;

  saveLog(msg: string, value: unknown): this;
  reduce(): Promise<{ key: string; value: unknown }[]>;

  /** @returns `undefined` if no `db` is given*/
  get(db: string, key?: string): Promise<unknown>;

  /** @param overwrite overwrite existing collection, default: `false`*/
  set(db: string, value: unknown, overwrite?: boolean): Promise<unknown>;
  update(db: string, key: string, value: unknown): Promise<unknown>;
  push(db: string, key: string, ...value: unknown[]): Promise<unknown[]>;
  pushToSet(db: string, key: string, ...value: unknown[]): Promise<unknown[]>;

  /**
   * @param key if not provided, the whole `db` gets deleted
   * @returns `true` if the element existed*/
  delete(db: string, key?: string): Promise<boolean>;
}

declare class DB extends NoCacheDB {
  /** The cache will be updated automatically*/
  cache: Collection<string, unknown>;

  fetchAll(): Promise<this>;
  fetch(db: string): Promise<unknown>;

  reduce(): { key: string; value: unknown }[];

  /** @returns `undefined` if no `db` is given */
  get(db: string, key?: string): unknown;

  /**
   * @inheritdoc
   * @returns `true` if the element existed or the key param is provied and `false` if the element did not exist*/
  delete(db: string, key?: string): Promise<boolean>;
}