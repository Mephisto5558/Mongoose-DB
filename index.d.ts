import type { Collection } from '@discordjs/collection';
import type { Document, Model, Types } from 'mongoose';

export { DB, NoCacheDB };
export default DB;

declare class NoCacheDB<Database extends Record<string, unknown>, FlattenedDatabase = { [DB in keyof Database]: FlattenObject<Database[DB]>; }> {
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
  reduce(): Promise<{ [DBK in keyof Database]: { key: DBK; value: Database[DBK] } }[keyof Database][]>;

  get(): Promise<undefined>;
  get<DBK extends keyof Database>(db: DBK): Promise<Database[DBK]>;
  get<DBK extends keyof Database, K extends keyof FlattenedDatabase[DBK]>(db: DBK, key: K): Promise<GetResult<Database, FlattenedDatabase, DBK, K>>;

  /** @param overwrite overwrite existing collection, default: `false` */
  set<DBK extends keyof Database, FDB extends FlattenedDatabase[DBK]>(db: DBK, value: FDB[keyof FDB], overwrite?: boolean): ModifyResult<Database, DBK>;
  update<DBK extends keyof Database, FDB extends FlattenedDatabase[DBK], K extends keyof FDB>(db: DBK, key: K, value: FDB[K]): ModifyResult<Database, DBK>;
  push<DBK extends keyof Database, FDB extends FlattenedDatabase[DBK], K extends keyof FDB>(db: DBK, key: K, ...value: FDB[K][]): ModifyResult<Database, DBK>;
  pushToSet<DBK extends keyof Database, FDB extends FlattenedDatabase[DBK], K extends keyof FDB>(db: DBK, key: K, ...value: FDB[K][]): ModifyResult<Database, DBK>;

  delete(): Promise<false>;
  delete(db: keyof Database): Promise<true>;

  /**
   * @param key **if not provided, the whole `db` gets deleted**
   * @returns `true` if the element existed */
  delete<DBK extends keyof Database>(db: DBK, key: keyof FlattenedDatabase[DBK]): Promise<boolean>;

  valueOf(): string;
}

declare class DB<Database extends Record<string, unknown>, FlattenedDatabase = { [DB in keyof Database]: FlattenObject<Database[DB]>; }> extends NoCacheDB<Database, FlattenedDatabase> {
  /** The cache will be updated automatically */
  cache: Collection<keyof Database, Database[keyof Database]>;

  fetchAll(this: DB): Promise<this>;
  fetch<DBK extends keyof Database>(this: DB, db: DBK): Promise<Database[DBK]>;

  reduce(this: DB): Awaited<ReturnType<NoCacheDB<Database, FlattenedDatabase>['reduce']>>;

  get(): undefined;
  get<DBK extends keyof Database>(this: DB, db: DBK): Database[DBK];
  get<DBK extends keyof Database, K extends keyof FlattenedDatabase[DBK]>(this: DB, db: DBK, key: K): GetResult<Database, FlattenedDatabase, DBK, K>;

  /** @param overwrite overwrite existing collection, default: `false` */
  set<DBK extends keyof Database, FDB extends FlattenedDatabase[DBK]>(this: DB, db: DBK, value: FDB[keyof FDB], overwrite?: boolean): ModifyResult<Database, DBK>;

  update<DBK extends keyof Database, FDB extends FlattenedDatabase[DBK], K extends keyof FDB>(this: DB, db: DBK, key: K, value: FDB[K]): ModifyResult<Database, DBK>;
  push<DBK extends keyof Database, FDB extends FlattenedDatabase[DBK], K extends keyof FDB>(this: DB, db: DBK, key: K, ...value: FDB[K][]): ModifyResult<Database, DBK>;
  pushToSet<DBK extends keyof Database, FDB extends FlattenedDatabase[DBK], K extends keyof FDB>(this: DB, db: DBK, key: K, ...value: FDB[K][]): ModifyResult<Database, DBK>;

  delete(): Promise<false>;
  delete(db: keyof Database): Promise<true>;

  /**
   * @inheritdoc
   * @returns `true` if the element existed or the key param is provied and `false` if the element did not exist */
  delete<DBK extends keyof Database>(this: DB, db: DBK, key?: keyof FlattenedDatabase[DBK]): Promise<boolean>;
}

type GetResult<Database, FlattenedDatabase, DBK extends keyof Database, K extends keyof FlattenedDatabase[DBK]> = (
 string extends keyof Database[DBK] ? FlattenedDatabase[DBK][K] | undefined : FlattenedDatabase[DBK][K]
);

type ModifyResult<Database, DBK extends keyof Database> = Promise<Database[DBK]> & {};


// https://github.com/blazejkustra/dynamode/blob/fd3abf1e420612811c3eba96ec431e00c28b2783/lib/utils/types.ts#L10

// Flatten entity
export type FlattenObject<TValue> = CollapseEntries<CreateObjectEntries<TValue, TValue>>;

type Entry = { key: string; value: unknown };
type EmptyEntry<TValue> = { key: ''; value: TValue };
type ExcludedTypes = Date | Set<unknown> | Map<unknown, unknown> | unknown[];
type ArrayEncoder = `[${bigint}]`;

type EscapeArrayKey<TKey extends string> = TKey extends `${infer TKeyBefore}.${ArrayEncoder}${infer TKeyAfter}`
  ? EscapeArrayKey<`${TKeyBefore}${ArrayEncoder}${TKeyAfter}`>
  : TKey;

// Transforms entries to one flattened type
type CollapseEntries<TEntry extends Entry> = { [E in TEntry as EscapeArrayKey<E['key']>]: E['value']; };

// Transforms array type to object
type CreateArrayEntry<TValue, TValueInitial> = OmitItself<
  TValue extends unknown[] ? Record<ArrayEncoder, TValue[number]> : TValue,
  TValueInitial
>;

// Omit the type that references itself
type OmitItself<TValue, TValueInitial> = TValue extends TValueInitial
  ? EmptyEntry<TValue>
  : OmitExcludedTypes<TValue, TValueInitial>;

// Omit the type that is listed in ExcludedTypes union
type OmitExcludedTypes<TValue, TValueInitial> = TValue extends ExcludedTypes
  ? EmptyEntry<TValue>
  : CreateObjectEntries<TValue, TValueInitial>;

type CreateObjectEntries<TValue, TValueInitial> = TValue extends object ? {

  // Checks that Key is of type string
  [TKey in keyof TValue]-?: TKey extends string

    // Nested key can be an object, run recursively to the bottom
    ? CreateArrayEntry<TValue[TKey], TValueInitial> extends infer TNestedValue
      ? TNestedValue extends Entry
        ? TNestedValue['key'] extends ''
          ? { key: TKey; value: TNestedValue['value'] }
          : { key: `${TKey}.${TNestedValue['key']}`; value: TNestedValue['value'] } | { key: TKey; value: TValue[TKey] }
        : never
      : never
    : never;
}[keyof TValue] // Builds entry for each key
  : EmptyEntry<TValue>;