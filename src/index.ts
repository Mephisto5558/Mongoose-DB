import Mongoose from 'mongoose';

export type { SettingsPaths, GetResult, AnyDB } from './utils.ts';
export { default as NoCacheDB } from './NoCacheDB.ts';
export { default, default as DB } from './DB.ts';


Mongoose.set('strictQuery', true);