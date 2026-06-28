/* eslint-disable unicorn/filename-case -- class-only export */
/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- needed for dynamic logic */

import Mongoose, { Schema, SchemaTypes } from 'mongoose';
import { DEFAULT_VALUE_LOGGING_MAX_JSONLENGTH, supportedTemporals } from './utils.ts';

import type { Model, UpdateQuery } from 'mongoose';
import type { AnyDB, DBDocument, DBType, GetResult, SerializedTemporal, SettingsPaths } from './utils.ts';

const temporalClasses = supportedTemporals ? Object.values(supportedTemporals) : [];


export default class NoCacheDB<Database extends DBType = DBType> implements AnyDB<Database> {
  protected static serialize(obj: unknown): unknown {
    return this.#serializeTemporal(obj);
  }

  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- used in body */
  protected static deserialize<Ret = unknown>(obj: unknown): Ret {
    return this.#deserializeTemporal<Ret>(obj);
  }

  static #serializeTemporal(obj: unknown): unknown {
    if (!obj || !supportedTemporals) return obj;

    if (Array.isArray(obj)) return obj.map(e => this.#serializeTemporal(e));

    if (typeof obj === 'object') {
      if (obj.constructor === Object) {
        const result: Record<string, unknown> = {};
        for (const key in obj) { // for-in for performance
          if (!Object.hasOwn(obj, key)) continue;
          result[key] = this.#serializeTemporal((obj as Record<string, unknown>)[key]);
        }

        return result;
      }

      for (const TemporalClass of temporalClasses) {
        if (!(obj instanceof TemporalClass)) continue;

        return {
          $temporal: obj.constructor.name as SerializedTemporal['$temporal'],
          $value: obj.toJSON()
        } satisfies SerializedTemporal;
      }
    }

    return obj;
  }

  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- used in body */
  static #deserializeTemporal<Ret>(obj: unknown): Ret {
    if (!obj || !supportedTemporals) return obj as Ret;

    if (Array.isArray(obj)) return obj.map(e => this.#deserializeTemporal(e)) as Ret;

    if (typeof obj === 'object' && obj.constructor === Object) {
      if ('$temporal' in obj)
        return supportedTemporals[(obj as SerializedTemporal).$temporal].from((obj as SerializedTemporal).$value) as Ret;

      const result: Record<string, unknown> = {};
      for (const key in obj) {
        if (!Object.hasOwn(obj, key)) continue;
        result[key] = this.#deserializeTemporal((obj as Record<string, unknown>)[key]);
      }

      return result as Ret;
    }

    return obj as Ret;
  }


  model!: Model<DBDocument<Database>>; // is initialized in init()
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

    // @ts-expect-error Being more general here as we don't have the types on runtime
    this.model = Mongoose.model<DBDocument<DBType>>(collection, new Schema({
      key: String,
      value: SchemaTypes.Mixed
    }, { strictQuery: true }));

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
    const query = this.model.find().select('key value -_id').lean();
    return NoCacheDB.deserialize(await query.exec());
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

    return NoCacheDB.deserialize(data);
  }

  async set<DBK extends keyof Database>(
    db: DBK, value: Partial<Database[DBK]>, overwrite?: boolean
  ): Promise<Database[DBK]>;
  async set(db: string, value: unknown, overwrite = false): Promise<unknown> {
    if (!db) return;

    this.saveLog(`setting collection ${db}, ${overwrite ? 'overwriting existing data' : ''}`, value);

    const update: UpdateQuery<DBDocument<Database>> = { $set: { value: NoCacheDB.serialize(value) } };
    if (!overwrite) update.$setOnInsert = { key: db };

    const data = await this.model.findOneAndUpdate({ key: db }, update, { new: true, upsert: true }).exec();
    return NoCacheDB.deserialize(data.value);
  }

  async update<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, value: Exclude<GetResult<Database[DBK], K>, undefined>
  ): Promise<Database[DBK]>;
  async update(db: string, key: string, value: unknown): Promise<unknown> {
    if (!key) return;

    this.saveLog(`updating ${db}.${key}`, value);

    const data = await this.model.findOneAndUpdate(
      { key: db },
      { $set: { [`value.${key}`]: NoCacheDB.serialize(value) } } as UpdateQuery<DBDocument<Database>>,
      { new: true, upsert: true }
    ).exec();

    return NoCacheDB.deserialize(data.value);
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

  delete(db?: string): Promise<boolean>;
  delete(db: keyof Database): Promise<true>;
  async delete<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K
  ): Promise<K extends SettingsPaths<Database[DBK]> ? true : false>;
  async delete(db: string, key?: string): Promise<boolean> {
    if (!db) return false;

    if (key) {
      this.saveLog(`deleting ${db}.${key}`);

      await this.model.findOneAndUpdate(
        { key: db }, { $unset: { [`value.${key}`]: '' } } as UpdateQuery<DBDocument<Database>>,
        { new: true, upsert: true }
      ).exec();
      return true;
    }

    this.saveLog(`deleting ${db}`);

    return (await this.model.deleteOne({ key: db }).exec()).deletedCount > 0;
  }

  valueOf(): string {
    return this.constructor.name; // for discord.js flatten function
  }

  async #push(set: boolean, db: string, key: string, ...value: unknown[]): Promise<unknown> {
    const values = value.length === 1 && Array.isArray(value[0]) ? value[0] : value;
    if (!db || !values.length) return;

    this.saveLog(`pushing data to ${db}.${key}`, values);

    const data = await this.model.findOneAndUpdate(
      { key: db },
      { [set ? '$addToSet' : '$push']: { [`value.${key}`]: { $each: NoCacheDB.serialize(values) } } } as UpdateQuery<DBDocument<Database>>,
      { new: true, upsert: true }
    ).exec();

    return NoCacheDB.deserialize(data.value);
  }
}