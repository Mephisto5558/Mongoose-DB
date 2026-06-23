import type { Document } from 'mongoose';
import type { DB, NoCacheDB } from './index.ts';

export const DEFAULT_VALUE_LOGGING_MAX_JSONLENGTH = 20;

export type DBType = Record<string, Record<string, unknown>>;
export type DBDocument<Database extends DBType> = { [K in keyof Database]: Database[K] } & Document;

export type PossiblePromise<T> = Promise<T> | T;

export const supportedTemporals = typeof Temporal === 'undefined'
  ? undefined
  : {
    Instant: Temporal.Instant,
    PlainDateTime: Temporal.PlainDateTime,
    PlainDate: Temporal.PlainDate,
    ZonedDateTime: Temporal.ZonedDateTime
  } satisfies Partial<Record<keyof typeof Temporal, {
    from: GenericFunction;
    new (...args: never): { toJSON(): string };
  }>>;

export type TemporalPrimitive = InstanceType<NonNullable<typeof supportedTemporals>[keyof NonNullable<typeof supportedTemporals>]>;
export type SerializedTemporal = { $temporal: keyof NonNullable<typeof supportedTemporals>; $value: string };

export type Primitive = string | number | boolean | bigint | undefined | null
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any, unicorn/prefer-temporal -- `any` is required here; Date is still supported */
  | Date | Set<unknown> | Map<unknown, unknown> | any[] | IfIsAny<TemporalPrimitive, { ifFalse: TemporalPrimitive }>;

export type Paths<T> = T extends Primitive
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

export type HasIndexSignature<T> = string extends keyof NonNullable<T> ? true : number extends keyof NonNullable<T> ? true : false;

export type GetResult<T, K extends string>
  = K extends `${infer Head}.${infer Tail}` // Recursive case
    ? Head extends keyof NonNullable<T>
      ? GetResult<NonNullable<T>[Head], Tail> | (HasIndexSignature<T> extends true ? undefined : never)
      : undefined
    : K extends keyof NonNullable<T> // Base case
      ? NonNullable<T>[K] | (HasIndexSignature<T> extends true ? undefined : never)
      : undefined;


/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- this is correct here */
export interface AnyDB<Database extends DBType = DBType> {
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