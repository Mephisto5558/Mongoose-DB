/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */

import { Collection as DiscordCollection } from '@discordjs/collection';
import Mongoose from 'mongoose';

import type { Document, Model, Schema, UpdateQuery } from 'mongoose';

Mongoose.set('strictQuery', true);

const DEFAULT_VALUE_LOGGING_MAX_JSONLENGTH = 20;

type DbDocument = { key: string; value: Record<string, Schema.Types.Mixed> } & Document;

// #region typing helpers
type PossiblePromise<T> = Promise<T> | T;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- `any` is required here */
type Primitive = string | number | boolean | bigint | Date | Set<unknown> | Map<unknown, unknown> | undefined | null | any[];

type Paths<T> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]: T[K] extends Primitive ? K : K | `${K}.${Paths<T[K]>}`
    }[keyof T & string];

export type SettingsPaths<T> = Paths<T> | (
  HasIndexSignature<T> extends true
    ? string extends keyof T
      ? `${string}.${Paths<T[string]>}`
      : never
    : never
);

type HasIndexSignature<T> = string extends keyof NonNullable<T> ? true : number extends keyof NonNullable<T> ? true : false;

export type GetResult<T, K extends string>
  = K extends `${infer Head}.${infer Tail}` // Recursive case
    ? Head extends keyof NonNullable<T>
      ? GetResult<NonNullable<T>[Head], Tail> | (HasIndexSignature<T> extends true ? undefined : never)
      : undefined
    : K extends keyof NonNullable<T> // Base case
      ? NonNullable<T>[K] | (HasIndexSignature<T> extends true ? undefined : never)
      : undefined;

// #endregion typing helpers

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- this is correct here */
export interface AnyDB<
  Database extends Record<string, unknown> = Record<string, unknown>
> {
  /* eslint-disable @typescript-eslint/no-duplicate-type-constituents -- keep types the exact same as `DB` and `NoCacheDB`. */
  model: DB<Database>['model'] | NoCacheDB<Database>['model'];
  valueLoggingMaxJSONLength: DB<Database>['valueLoggingMaxJSONLength'] | NoCacheDB<Database>['valueLoggingMaxJSONLength'];

  init: DB<Database>['init'] | NoCacheDB<Database>['init'];
  saveLog: DB<Database>['saveLog'] | NoCacheDB<Database>['saveLog'];

  reduce(): Promise<{
    [DBK in keyof Database]: { key: DBK; value: Database[DBK] };
  }[keyof Database][]>;

  get(): PossiblePromise<undefined>;
  get<DBK extends keyof Database>(db: DBK): PossiblePromise<Database[DBK]>;
  get<DBK extends keyof Database, K extends keyof Database[DBK] & string>(
    db: DBK, key: K
  ): PossiblePromise<GetResult<Database[DBK], K>>;
  get<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K
  ): PossiblePromise<GetResult<Database[DBK], K>>;
  get(db?: string, key?: string): PossiblePromise<unknown>; // fallback
  get(db?: keyof Database, key?: string): PossiblePromise<unknown>;

  set<DBK extends keyof Database>(
    db: DBK, value: Partial<Database[DBK]>, overwrite?: boolean
  ): Promise<Database[DBK]>;
  set(db: string, value: unknown, overwrite?: boolean): Promise<unknown>;

  update<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, value: Exclude<GetResult<Database[DBK], K>, undefined>
  ): Promise<Database[DBK]>;
  update(db: string, key: string, value: unknown): Promise<unknown>;

  push<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, ...value: GetResult<Database[DBK], K> extends (infer E)[] ? E[] : never
  ): Promise<Database[DBK]>;
  push(db: string, key: string, ...value: unknown[]): Promise<unknown>;

  pushToSet<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, ...value: GetResult<Database[DBK], K> extends (infer E)[] ? E[] : never
  ): Promise<Database[DBK]>;
  pushToSet(db: string, key: string, ...value: unknown[]): Promise<unknown>;

  delete(db?: string): Promise<boolean>;
  delete(db: keyof Database): Promise<true>;
  delete<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K
  ): Promise<K extends SettingsPaths<Database[DBK]> ? true : false>;

  valueOf(): string;
  /* eslint-enable @typescript-eslint/no-duplicate-type-constituents */
}

export class NoCacheDB<Database extends Record<string, unknown> = Record<string, unknown>> implements AnyDB<Database> {
  model!: Model<DbDocument>; // is initialized in init()
  valueLoggingMaxJSONLength: number = DEFAULT_VALUE_LOGGING_MAX_JSONLENGTH;
  #logDebug: (...str: unknown[]) => unknown = console.debug;

  async init(
    dbConnectionString: string,
    collection = 'db-collections',
    valueLoggingMaxJSONLength?: number | false,
    debugLoggingFunction?: (...str: unknown[]) => unknown
  ): Promise<this> {
    if (Mongoose.connection.readyState !== Mongoose.ConnectionStates.connected) {
      if (!dbConnectionString) throw new Error('A Connection String is required!');
      await Mongoose.connect(dbConnectionString);
    }

    this.model = Mongoose.model<DbDocument>(collection, new Mongoose.Schema({
      key: String,
      value: Mongoose.SchemaTypes.Mixed
    }));

    if (debugLoggingFunction) this.#logDebug = debugLoggingFunction;
    if (valueLoggingMaxJSONLength !== undefined) this.valueLoggingMaxJSONLength = valueLoggingMaxJSONLength || 0;

    return this;
  }

  saveLog(msg: string, value?: unknown): this {
    const jsonValue = JSON.stringify(value);
    this.#logDebug(msg + (jsonValue && this.valueLoggingMaxJSONLength >= jsonValue.length ? `, value: ${jsonValue}` : ''));
    return this;
  }

  async reduce(): Promise<{ [DBK in keyof Database]: { key: DBK; value: Database[DBK] } }[keyof Database][]> {
    return this.model.find().select('key value -_id').exec() as unknown as ReturnType<NoCacheDB<Database>['reduce']>; // this is the correct type
  }

  async get(): Promise<undefined>;
  async get<DBK extends keyof Database>(db: DBK): Promise<Database[DBK]>;
  async get<DBK extends keyof Database, K extends keyof Database[DBK] & string>(
    db: DBK, key: K
  ): Promise<GetResult<Database[DBK], K>>;
  async get<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K
  ): Promise<GetResult<Database[DBK], K>>;
  async get(db?: string, key?: string): Promise<unknown> {
    if (!db) return;

    let data = (await this.model.findOne({ key: db }).exec())?.value as unknown;
    if (key && data) {
      for (const objKey of key.split('.')) {
        data = (data as Record<string, unknown> | null)?.[objKey];
        if (data === undefined) return data;
      }
    }

    return data;
  }

  async set<DBK extends keyof Database>(
    db: DBK, value: Partial<Database[DBK]>, overwrite?: boolean
  ): Promise<Database[DBK]>;
  async set(db: string, value: unknown, overwrite = false): Promise<unknown> {
    if (!db) return;

    this.saveLog(`setting collection ${db}, ${overwrite ? 'overwriting existing data' : ''}`, value);

    const update: UpdateQuery<DbDocument> = { $set: { value } };
    if (!overwrite) update.$setOnInsert = { key: db };

    const data = await this.model.findOneAndUpdate({ key: db }, update, { new: true, upsert: true }).exec();
    return data.value;
  }

  async update<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, value: Exclude<GetResult<Database[DBK], K>, undefined>
  ): Promise<Database[DBK]>;
  async update(db: string, key: string, value: unknown): Promise<unknown> {
    if (!key) return;

    this.saveLog(`updating ${db}.${key}`, value);

    const data = await this.model.findOneAndUpdate({ key: db }, { $set: { [`value.${key}`]: value } }, { new: true, upsert: true }).exec();
    return data.value;
  }

  async push<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, ...value: GetResult<Database[DBK], K> extends (infer E)[] ? E[] : never
  ): Promise<Database[DBK]>;
  async push(db: string, key: string, ...value: unknown[]): Promise<unknown> {
    return this.#push(false, db, key, ...value);
  }

  async pushToSet<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, ...value: GetResult<Database[DBK], K> extends (infer E)[] ? E[] : never
  ): Promise<Database[DBK]>;
  async pushToSet(db: string, key: string, ...value: unknown[]): Promise<unknown> {
    return this.#push(true, db, key, ...value);
  }

  async #push(set: boolean, db: string, key: string, ...value: unknown[]): Promise<unknown> {
    const values = value.length === 1 && Array.isArray(value[0]) ? value[0] : value;
    if (!db || !values.length) return;

    this.saveLog(`pushing data to ${db}.${key}`, values);

    const data = await this.model.findOneAndUpdate(
      { key: db },
      { [set ? '$addToSet' : '$push']: { [`value.${key}`]: { $each: values } } },
      { new: true, upsert: true }
    ).exec();

    return data.value;
  }

  delete(db?: string): Promise<boolean>;
  delete(db: keyof Database): Promise<true>;
  async delete<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K
  ): Promise<K extends SettingsPaths<Database[DBK]> ? true : false>;
  async delete(db: string, key?: string): Promise<boolean> {
    if (!db) return false;

    if (key) {
      this.saveLog(`deleting ${db}.${key}`);

      await this.model.findOneAndUpdate({ key: db }, { $unset: { [`value.${key}`]: '' } }, { new: true, upsert: true }).exec();
      return true;
    }

    this.saveLog(`deleting ${db}`);

    return (await this.model.deleteOne({ key: db }).exec()).deletedCount > 0;
  }

  valueOf(): string {
    return this.constructor.name; // for discord.js flatten function
  }
}

export class DB<Database extends Record<string, unknown> = Record<string, unknown>> extends NoCacheDB<Database> implements AnyDB<Database> {
  cache = new DiscordCollection<keyof Database, Database[keyof Database]>();

  override async init(...superParams: Parameters<NoCacheDB<Database>['init']>): Promise<this> {
    await super.init(...superParams);
    return this.fetchAll();
  }

  async fetchAll(): Promise<this> {
    for (const { key, value } of await super.reduce()) this.cache.set(key, value);
    return this;
  }

  async fetch<DBK extends keyof Database>(db: DBK): Promise<Database[DBK]> {
    const value = await super.get(db);
    this.cache.set(db, value);
    return value;
  }

  // @ts-expect-error overriding with a non-Promise return
  override reduce(
  ): { key: keyof Database; value: Database[keyof Database] }[] {
    return this.cache.reduce<{ key: keyof Database; value: Database[keyof Database] }[]>((acc, value, key) => {
      acc.push({ key, value });
      return acc;
    }, []);
  }

  // @ts-expect-error overriding with a non-Promise return
  override get(): undefined;

  // @ts-expect-error overriding with a non-Promise return
  override get<DBK extends keyof Database>(db: DBK): Database[DBK];

  // @ts-expect-error overriding with a non-Promise return
  override get<DBK extends keyof Database, K extends keyof Database[DBK] & string>(
    db: DBK, key: K
  ): GetResult<Database[DBK], K>;

  // @ts-expect-error overriding with a non-Promise return
  override get<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K
  ): GetResult<Database[DBK], K>;

  // @ts-expect-error overriding with a non-Promise return
  override get(db?: string, key?: string): unknown; // fallback

  // @ts-expect-error overriding with a non-Promise return
  override get(db?: keyof Database, key?: string): unknown {
    if (!db) return;

    let data = this.cache.get(db) as unknown;
    if (key && data != undefined) {
      for (const objKey of key.split('.')) {
        data = (data as Record<string, unknown> | undefined)?.[objKey];
        if (data === undefined) return data;
      }
    }

    return data;
  }

  override async set<DBK extends keyof Database>(
    db: DBK, value: Partial<Database[DBK]>, overwrite = false
  ): Promise<Database[DBK]> {
    const data = await super.set(db, value, overwrite);

    this.cache.set(db, data);
    return data;
  }

  override async update<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, value: Exclude<GetResult<Database[DBK], K>, undefined>
  ): Promise<Database[DBK]> {
    const data = await super.update(db, key, value);

    this.cache.set(db, data);
    return data;
  }

  override async push<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, ...value: GetResult<Database[DBK], K> extends (infer E)[] ? E[] : never
  ): Promise<Database[DBK]> {
    const data = await super.push(db, key, ...value);
    this.cache.set(db, data);

    return data;
  }

  override async pushToSet<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, ...value: GetResult<Database[DBK], K> extends (infer E)[] ? E[] : never
  ): Promise<Database[DBK]> {
    const data = await super.pushToSet(db, key, ...value);
    this.cache.set(db, data as Database[DBK]);

    return data;
  }

  override async delete(db?: string): Promise<boolean>;
  override async delete(db: keyof Database): Promise<true>;
  override async delete<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K
  ): Promise<K extends SettingsPaths<Database[DBK]> ? true : false>;
  override async delete(db: string, key?: string): Promise<boolean> {
    if (!db) return false;
    if (key) {
      this.saveLog(`deleting ${db}.${key}`);

      const data = await this.model.findOneAndUpdate({ key: db }, { $unset: { [`value.${key}`]: '' } }, { new: true, upsert: true }).exec();
      this.cache.set(db as keyof Database, data.value as Database[keyof Database]);
      return true;
    }

    const
      deletedFromDb = await super.delete(db),
      deletedFromCache = this.cache.delete(db as keyof Database);

    return deletedFromDb || deletedFromCache;
  }
}
export default DB;