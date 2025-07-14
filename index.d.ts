import type { Collection } from '@discordjs/collection';
import type { Document, Model, Types } from 'mongoose';

export { DB, NoCacheDB };
export default DB;

declare class NoCacheDB<Database extends Record<string, unknown>> {
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
  get<DBK extends keyof Database, K extends string>(db: DBK, key: K): Promise<GetValueByKey<Database[DBK], K> | undefined>;
  get(db: unknown, key?: unknown): Promise<unknown>; // fallback
  get<DBK extends keyof Database, K extends keyof FlattenedDatabase[DBK]>(db: DBK, key: K): Promise<GetResult<Database, FlattenedDatabase, DBK, K>>;

  /** @param overwrite overwrite existing collection, default: `false` */
  set<DBK extends keyof Database>(db: DBK, value: Partial<Database[DBK]>, overwrite?: boolean): ModifyResult<Database, DBK>;
  update<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(db: DBK, key: K, value: GetValueByKey<Database[DBK], K>): ModifyResult<Database, DBK>;

  push<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(db: DBK, key: K, ...value: (GetValueByKey<Database[DBK], K> extends (infer E)[] ? E : never)[]): ModifyResult<Database, DBK>;
  pushToSet<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, ...value: (GetValueByKey<Database[DBK], K> extends (infer E)[] ? E : never)[]
  ): ModifyResult<Database, DBK>;


  /**
   * @param key **if not provided, the whole `db` gets deleted**
   * @returns `true` if the element existed */
  delete(): Promise<false>;
  delete(db: keyof Database): Promise<true>;
  delete<DBK extends keyof Database>(db: DBK, key: SettingsPaths<Database[DBK]>): Promise<boolean>;

  valueOf(): string;
}

declare class DB<Database extends Record<string, unknown>> extends NoCacheDB<Database> {
  cache: Collection<keyof Database, Database[keyof Database]>;

  fetchAll(this: DB): Promise<this>;
  fetch<DBK extends keyof Database>(this: DB, db: DBK): Promise<Database[DBK]>;

  reduce(this: DB): Awaited<ReturnType<NoCacheDB<Database>['reduce']>>;

  get(): undefined;
  get<DBK extends keyof Database>(this: DB, db: DBK): Database[DBK];
  get<DBK extends keyof Database, K extends string>(this: DB, db: DBK, key: K): GetValueByKey<Database[DBK], K> | undefined;
  get(db: unknown, key?: unknown): unknown; // fallback

  set<DBK extends keyof Database>(this: DB, db: DBK, value: Partial<Database[DBK]>, overwrite?: boolean): ModifyResult<Database, DBK>;
  update<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(this: DB, db: DBK, key: K, value: GetValueByKey<Database[DBK], K>): ModifyResult<Database, DBK>;

  push<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    this: DB, db: DBK, key: K, ...value: (GetValueByKey<Database[DBK], K> extends (infer E)[] ? E : never)[]
  ): ModifyResult<Database, DBK>;
  pushToSet<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    this: DB, db: DBK, key: K, ...value: (GetValueByKey<Database[DBK], K> extends (infer E)[] ? E : never)[]
  ): ModifyResult<Database, DBK>;

  delete(): Promise<false>;
  delete(db: keyof Database): Promise<true>;
  delete<DBK extends keyof Database>(this: DB, db: DBK, key?: SettingsPaths<Database[DBK]>): Promise<boolean>;
}

type ModifyResult<Database, DBK extends keyof Database> = Promise<Database[DBK]> & {};

export type GetValueByKey<T, K extends string>
  = K extends `${infer Head}.${infer Tail}`
    ? string extends keyof T
      ? GetValueByKey<T[keyof T], Tail>
      : Head extends keyof T
        ? GetValueByKey<T[Head], Tail>
        : undefined
    : string extends keyof T
      ? T[keyof T]
      : K extends keyof T
        ? T[K]
        : undefined;

type Primitive = string | number | boolean | bigint | Date | Set<unknown> | Map<unknown, unknown> | undefined | null | unknown[];

type Paths<T> = T extends Primitive
  ? never
  : {
    [K in keyof T & string]: T[K] extends Primitive ? K : K | `${K}.${Paths<T[K]>}`
  }[keyof T & string];

export type SettingsPaths<T> = string extends keyof T ? Paths<T[keyof T]> : Paths<T>;