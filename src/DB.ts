/* eslint-disable unicorn/filename-case -- class-only export */
/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- needed for dynamic logic */

import { Collection as DiscordCollection } from '@discordjs/collection';
import NoCacheDB from './NoCacheDB.ts';

import type { UpdateQuery } from 'mongoose';
import type { AnyDB, DBDocument, DBType, GetResult, SettingsPaths } from './utils.ts';

export default class DB<Database extends DBType = DBType> extends NoCacheDB<Database> implements AnyDB<Database> {
  readonly cache = new DiscordCollection<keyof Database, Database[keyof Database]>();

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
    return this.cache.map((value, key) => ({ key, value }));
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
    /* eslint-disable-next-line unicorn/no-return-array-push -- false positive: not an Array */
    const data = await super.push(db, key, ...value);
    this.cache.set(db, data);

    return data;
  }

  override async pushToSet<DBK extends keyof Database, K extends SettingsPaths<Database[DBK]>>(
    db: DBK, key: K, ...value: GetResult<Database[DBK], K> extends (infer E)[] ? E[] : never
  ): Promise<Database[DBK]> {
    const data = await super.pushToSet(db, key, ...value);
    this.cache.set(db, data);

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

      const data = await this.model.findOneAndUpdate(
        { key: db }, { $unset: { [`value.${key}`]: '' } } as UpdateQuery<DBDocument<Database>>,
        { new: true, upsert: true }
      ).exec();

      this.cache.set(db, NoCacheDB.deserialize(data.value));
      return true;
    }

    const
      deletedFromDb = await super.delete(db),
      deletedFromCache = this.cache.delete(db);

    return deletedFromDb || deletedFromCache;
  }
}