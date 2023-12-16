import { Collection } from '@discordjs/collection';
import { Document, Model, Types } from 'mongoose';

export { DB, NoCacheDB }
export default DB

declare class DB {
  schema: Model<Document<unknown, {}, {
    _id: Types.ObjectId,
    key: string,
    value?: any
  }>>;

  /**The cache will be updated automatically*/
  cache: Collection<string, any>;
  valueLoggingMaxJSONLength: number;

  /**
   * @param dbConnectionString MongoDB connection string
   * @param valueLoggingMaxJSONLength default:20, false to disable value logging
   */
  constructor(dbConnectionString: string, collection?: string, valueLoggingMaxJSONLength?: number | false): DB;

  saveLog(msg: string, value: any): DB;
  fetchAll(): Promise<DB>;
  fetch(db: string): Promise<any>;

  /**@returns `undefined` if no `db` is given */
  get(db: string, key?: string): any;
  
  /**@param overwrite overwrite existing collection, default: `false`*/
  set(db: string, value: any, overwrite?: boolean): Promise<any>;
  update(db: string, key: string, value: any): Promise<any>;
  push(db: string, key: string, ...value: any[]): Promise<any[]>;
  pushToSet(db: string, key: string, ...value: any[]): Promise<any[]>;
  
  /**
   * @param key if not provided, the whole `db` gets deleted
   * @returns `true` if the element existed or the key param is provied and `false` if the element did not exist
   */
  delete(db: string, key?: string): Promise<boolean>;
}

declare class NoCacheDB {
  schema: Model<Document<unknown, {}, {
    _id: Types.ObjectId,
    key: string,
    value?: any
  }>>;

  /**The cache will be updated automatically*/
  cache: Collection<string, any>;
  valueLoggingMaxJSONLength: number;

  /**
   * This class is mostly the same as the DB class but doesn't have a cache so some functions return promises.
   * @param dbConnectionString MongoDB connection string
   * @param valueLoggingMaxJSONLength default:20, false to disable value logging
   */
  constructor(dbConnectionString: string, collection?: string, valueLoggingMaxJSONLength?: number | false): DB;

  saveLog(msg: string, value: any): NoCacheDB;

  /**@returns `undefined` if no `db` is given */
  get(db: string, key?: string): Promise<any>;
  
  /**@param overwrite overwrite existing collection, default: `false`*/
  set(db: string, value: any, overwrite?: boolean): Promise<any>;
  update(db: string, key: string, value: any): Promise<any>;
  push(db: string, key: string, ...value: any[]): Promise<any[]>;
  pushToSet(db: string, key: string, ...value: any[]): Promise<any[]>;
  
  /**
   * @param key if not provided, the whole `db` gets deleted
   * @returns `true` if the element existed
   */
  delete(db: string, key?: string): Promise<boolean>;
}