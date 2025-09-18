import type { Collection } from '@discordjs/collection';
import type { Model, Schema } from 'mongoose';

export { DB, NoCacheDB, BaseDB };
export default DB;

// Source: https://github.com/microsoft/TypeScript/issues/54451#issue-1732749888
type Omit<T, K extends keyof T> = { [P in keyof T as P extends K ? never : P]: T[P] };


declare abstract class BaseDB<Database extends Record<string, unknown>, PromiseReturn extends boolean> {
  schema: Model<{ key: string; value?: Schema.Types.Mixed }>;

  valueLoggingMaxJSONLength: number;

  /**
   * @param dbConnectionString MongoDB connection string
   * @param valueLoggingMaxJSONLength default:`20`, `false` to disable value logging
   * @param debugLoggingFunction default: `console.debug` */
  init(
    dbConnectionString: string, collection?: string,
    valueLoggingMaxJSONLength?: number | false, debugLoggingFunction?: (...str: unknown[]) => unknown
  ): Promise<this>;

  saveLog(msg: string, value?: unknown): this;
  reduce(): PromiseToggle<{ [DBK in keyof Database]: { key: DBK; value: Database[DBK] } }[keyof Database][], PromiseReturn>;

  get(): PromiseToggle<undefined, PromiseReturn>;
  get<DBK extends keyof Database>(db: DBK): PromiseToggle<Database[DBK], PromiseReturn>;
  get<
    DBK extends keyof Database, Head extends keyof Database[DBK] & string, Tail extends SettingsPaths<Database[DBK][Head]>
  >(db: DBK, key: `${Head}.${Tail}`): PromiseToggle<GetResult<Database[DBK], `${Head}.${Tail}`>, PromiseReturn>;
  get<
    DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>
  >(db: DBK, key: K): PromiseToggle<GetResult<Database[DBK], K>, PromiseReturn>;
  get(db: unknown, key?: unknown): PromiseToggle<unknown, PromiseReturn>; // fallback

  /** @param overwrite overwrite existing collection, default: `false` */
  set<DBK extends keyof Database>(
    db: DBK, value: Partial<Omit<Database[DBK], undefined>>, overwrite?: boolean
  ): ModifyResult<Database, DBK>;

  // region update

  // depth 10
  update<
    DBK extends keyof Database,
    K1 extends keyof Database[DBK] & string,
    K2 extends keyof Database[DBK][K1] & string,
    K3 extends keyof Database[DBK][K1][K2] & string,
    K4 extends keyof Database[DBK][K1][K2][K3] & string,
    K5 extends keyof Database[DBK][K1][K2][K3][K4] & string,
    K6 extends keyof Database[DBK][K1][K2][K3][K4][K5] & string,
    K7 extends keyof Database[DBK][K1][K2][K3][K4][K5][K6] & string,
    K8 extends keyof Database[DBK][K1][K2][K3][K4][K5][K6][K7] & string,
    K9 extends keyof Database[DBK][K1][K2][K3][K4][K5][K6][K7][K8] & string,
    K10 extends SettingsPaths<Database[DBK][K1][K2][K3][K4][K5][K6][K7][K8][K9]>
  >(
    db: DBK, key: `${K1}.${K2}.${K3}.${K4}.${K5}.${K6}.${K7}.${K8}.${K9}.${K10}`,
    value: Omit<GetValueByKey<Database[DBK], `${K1}.${K2}.${K3}.${K4}.${K5}.${K6}.${K7}.${K8}.${K9}.${K10}`>, undefined>
  ): ModifyResult<Database, DBK>;

  // depth 9
  update<
    DBK extends keyof Database,
    K1 extends keyof Database[DBK] & string,
    K2 extends keyof Database[DBK][K1] & string,
    K3 extends keyof Database[DBK][K1][K2] & string,
    K4 extends keyof Database[DBK][K1][K2][K3] & string,
    K5 extends keyof Database[DBK][K1][K2][K3][K4] & string,
    K6 extends keyof Database[DBK][K1][K2][K3][K4][K5] & string,
    K7 extends keyof Database[DBK][K1][K2][K3][K4][K5][K6] & string,
    K8 extends keyof Database[DBK][K1][K2][K3][K4][K5][K6][K7] & string,
    K9 extends SettingsPaths<Database[DBK][K1][K2][K3][K4][K5][K6][K7][K8]>
  >(
    db: DBK, key: `${K1}.${K2}.${K3}.${K4}.${K5}.${K6}.${K7}.${K8}.${K9}`,
    value: Omit<GetValueByKey<Database[DBK], `${K1}.${K2}.${K3}.${K4}.${K5}.${K6}.${K7}.${K8}.${K9}`>, undefined>
  ): ModifyResult<Database, DBK>;

  // depth 8
  update<
    DBK extends keyof Database,
    K1 extends keyof Database[DBK] & string,
    K2 extends keyof Database[DBK][K1] & string,
    K3 extends keyof Database[DBK][K1][K2] & string,
    K4 extends keyof Database[DBK][K1][K2][K3] & string,
    K5 extends keyof Database[DBK][K1][K2][K3][K4] & string,
    K6 extends keyof Database[DBK][K1][K2][K3][K4][K5] & string,
    K7 extends keyof Database[DBK][K1][K2][K3][K4][K5][K6] & string,
    K8 extends SettingsPaths<Database[DBK][K1][K2][K3][K4][K5][K6][K7]>
  >(
    db: DBK, key: `${K1}.${K2}.${K3}.${K4}.${K5}.${K6}.${K7}.${K8}`,
    value: Omit<GetValueByKey<Database[DBK], `${K1}.${K2}.${K3}.${K4}.${K5}.${K6}.${K7}.${K8}`>, undefined>
  ): ModifyResult<Database, DBK>;

  // depth 7
  update<
    DBK extends keyof Database,
    K1 extends keyof Database[DBK] & string,
    K2 extends keyof Database[DBK][K1] & string,
    K3 extends keyof Database[DBK][K1][K2] & string,
    K4 extends keyof Database[DBK][K1][K2][K3] & string,
    K5 extends keyof Database[DBK][K1][K2][K3][K4] & string,
    K6 extends keyof Database[DBK][K1][K2][K3][K4][K5] & string,
    K7 extends SettingsPaths<Database[DBK][K1][K2][K3][K4][K5][K6]>
  >(
    db: DBK, key: `${K1}.${K2}.${K3}.${K4}.${K5}.${K6}.${K7}`,
    value: Omit<GetValueByKey<Database[DBK], `${K1}.${K2}.${K3}.${K4}.${K5}.${K6}.${K7}`>, undefined>
  ): ModifyResult<Database, DBK>;

  // depth 6
  update<
    DBK extends keyof Database,
    K1 extends keyof Database[DBK] & string,
    K2 extends keyof Database[DBK][K1] & string,
    K3 extends keyof Database[DBK][K1][K2] & string,
    K4 extends keyof Database[DBK][K1][K2][K3] & string,
    K5 extends keyof Database[DBK][K1][K2][K3][K4] & string,
    K6 extends SettingsPaths<Database[DBK][K1][K2][K3][K4][K5]>
  >(
    db: DBK, key: `${K1}.${K2}.${K3}.${K4}.${K5}.${K6}`,
    value: Omit<GetValueByKey<Database[DBK], `${K1}.${K2}.${K3}.${K4}.${K5}.${K6}`>, undefined>
  ): ModifyResult<Database, DBK>;

  // depth 5
  update<
    DBK extends keyof Database,
    K1 extends keyof Database[DBK] & string,
    K2 extends keyof Database[DBK][K1] & string,
    K3 extends keyof Database[DBK][K1][K2] & string,
    K4 extends keyof Database[DBK][K1][K2][K3] & string,
    K5 extends SettingsPaths<Database[DBK][K1][K2][K3][K4]>
  >(
    db: DBK, key: `${K1}.${K2}.${K3}.${K4}.${K5}`,
    value: Omit<GetValueByKey<Database[DBK], `${K1}.${K2}.${K3}.${K4}.${K5}`>, undefined>
  ): ModifyResult<Database, DBK>;

  // depth 4
  update<
    DBK extends keyof Database,
    K1 extends keyof Database[DBK] & string,
    K2 extends keyof Database[DBK][K1] & string,
    K3 extends keyof Database[DBK][K1][K2] & string,
    K4 extends SettingsPaths<Database[DBK][K1][K2][K3]>
  >(
    db: DBK, key: `${K1}.${K2}.${K3}.${K4}`,
    value: Omit<GetValueByKey<Database[DBK], `${K1}.${K2}.${K3}.${K4}`>, undefined>
  ): ModifyResult<Database, DBK>;

  // depth 3
  update<
    DBK extends keyof Database,
    K1 extends keyof Database[DBK] & string,
    K2 extends keyof Database[DBK][K1] & string,
    K3 extends SettingsPaths<Database[DBK][K1][K2]>
  >(
    db: DBK, key: `${K1}.${K2}.${K3}`,
    value: Omit<GetValueByKey<Database[DBK], `${K1}.${K2}.${K3}`>, undefined>
  ): ModifyResult<Database, DBK>;

  // depth 2
  update<
    DBK extends keyof Database,
    K1 extends keyof Database[DBK] & string,
    K2 extends SettingsPaths<Database[DBK][K1]>
  >(
    db: DBK, key: `${K1}.${K2}`,
    value: Omit<GetValueByKey<Database[DBK], `${K1}.${K2}`>, undefined>
  ): ModifyResult<Database, DBK>;

  // depth 1 & fallback
  update<
    DBK extends keyof Database,
    K extends SettingsPaths<Database[DBK]>
  >(db: DBK, key: K, value: Omit<GetValueByKey<Database[DBK], K>, undefined>): ModifyResult<Database, DBK>;

  // endregion update

  push<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K,
    ...value: ArrayElement<GetValueByKey<Database[DBK], K>>[]
  ): ModifyResult<Database, DBK>;
  pushToSet<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K,
    ...value: ArrayElement<GetValueByKey<Database[DBK], K>>[]
  ): ModifyResult<Database, DBK>;


  /**
   * @param key **if not provided, the whole `db` gets deleted**
   * @returns `true` if the element existed */
  delete(db?: unknown): Promise<false>;
  delete(db: keyof Database): Promise<true>;
  delete<
    DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>
  >(db: DBK, key: K): Promise<K extends SettingsPaths<Database[DBK]> ? true : false>;

  valueOf(): string;
}

declare class NoCacheDB<Database extends Record<string, unknown> = Record<string, unknown>> extends BaseDB<Database, true> {
}

declare class DB<Database extends Record<string, unknown> = Record<string, unknown>> extends BaseDB<Database, false> {
  cache: Collection<keyof Database, Database[keyof Database]>;

  fetchAll(): Promise<this>;
  fetch<DBK extends keyof Database>(db: DBK): Promise<Database[DBK]>;
}

type PromiseToggle<T, usePromise extends boolean = false> = usePromise extends true ? Promise<T> : T;

type ModifyResult<Database, DBK extends keyof Database> = Promise<Database[DBK]> & {};

export type GetValueByKey<T, K extends string>
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- defer type devaluation */
  = T extends any
    ? K extends `${infer Head}.${infer Tail}` // is it a nested path?
      ? Head extends keyof T // is it the exact head?
        ? GetValueByKey<T[Head], Tail>
        : string extends keyof T // is it a Record<string, unknown>?
          ? GetValueByKey<T[string], Tail>
          : undefined
      : K extends keyof T // is it not a nested path?
        ? T[K]
        : string extends keyof T // is it a Record<string, unknown>?
          ? T[string] // same as V, but more explicit
          : undefined
    : never; // fallback that should never be reached

type Primitive = string | number | boolean | bigint | Date | Set<unknown> | Map<unknown, unknown> | undefined | null | unknown[];

type Paths<T> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]: T[K] extends Primitive ? K : K | `${K}.${Paths<T[K]>}`
    }[keyof T & string];

export type SettingsPaths<T> = string extends keyof T ? Paths<T[keyof T]> : Paths<T>;

/** Returns true if the path involves an unchecked indexed access (e.g., through a Record). */
type IsUncheckedIndexedAccess<T, K extends string>
  = K extends `${infer Head}.${infer Tail}`
    ? T extends Record<string, infer _V>
      ? true
      : Head extends keyof T
        ? IsUncheckedIndexedAccess<T[Head], Tail>
        : false
    : T extends Record<string, infer _V>
      ? true
      : false;

type GetResult<T, K extends string>
  = GetValueByKey<T, K> extends infer RawType
    ? undefined extends RawType // does it include undefined?
      ? RawType
      : IsUncheckedIndexedAccess<T, K> extends true
        ? RawType | undefined
        : RawType
    : never; // fallback that should never be reached

type ArrayElement<T> = T extends (infer E)[] ? E : never;