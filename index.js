const
  Mongoose = require('mongoose').default.set('strictQuery', true),
  { Collection } = require('@discordjs/collection');

global.log ??= {
  debug: (...data) => { console.debug(...data); return log; },
  setType: () => log
}; //if the file is running separately

class NoCacheDB {
  async init(dbConnectionString, collection = 'db-collection', valueLoggingMaxJSONLength = 20) {
    if (Mongoose.connection.readyState != 1) {
      if (!dbConnectionString) throw new Error('A Connection String is required!');
      await Mongoose.connect(dbConnectionString);
    }

    this.schema = Mongoose.model(collection, new Mongoose.Schema({
      key: String,
      value: Mongoose.SchemaTypes.Mixed
    }));

    if (valueLoggingMaxJSONLength === false) this.valueLoggingMaxJSONLength = 0;
    else this.valueLoggingMaxJSONLength = Number.isNaN(valueLoggingMaxJSONLength) ? 20 : valueLoggingMaxJSONLength;
  }

  saveLog(msg, value) {
    const jsonValue = JSON.stringify(value);
    log.setType('DB').debug(msg + (this.valueLoggingMaxJSONLength >= jsonValue?.length ? `, value: ${jsonValue}` : '')).setType();
    return this;
  }

  reduce() {
    return this.schema.find().select('key value -_id').exec();
  }

  async get(db, key) {
    let data = (await this.schema.findOne({ key: db }).exec())?.value;
    if (key) for (const objKey of key.split('.')) {
      data = data?.[objKey];
      if (data === undefined) return data;
    }

    return data;
  }

  async set(db, value, overwrite = false) {
    if (!db) return;

    this.saveLog(`setting collection ${db}, ${overwrite ? 'overwriting existing data' : ''}`, value);

    const update = { $set: { value } };
    if (!overwrite) update.$setOnInsert = { key: db };

    const data = await this.schema.findOneAndUpdate({ key: db }, update, { new: true, upsert: true }).exec();
    return data.value;
  }

  async update(db, key, value) {
    if (!key) return;

    this.saveLog(`updating ${db}.${key}`, value);

    const data = await this.schema.findOneAndUpdate({ key: db }, { $set: { [`value.${key}`]: value } }, { new: true, upsert: true }).exec();
    return data.value;
  }

  push(db, key, ...value) { return this.#push(false, db, key, ...value); }
  pushToSet(db, key, ...value) { return this.#push(true, db, key, ...value); }

  /**@param {boolean}set If true, there will be no duplicates @param {string}db @param {string}key @returns {Array}value*/
  async #push(set, db, key, ...value) {
    const values = value.length == 1 && Array.isArray(value[0]) ? value[0] : value;
    if (!db || !values.length) return;

    this.saveLog(`pushing data to ${db}.${key}`, values);

    const data = await this.schema.findOneAndUpdate({ key: db }, { [set ? '$addToSet' : '$push']: { [`value.${key}`]: { $each: values } } }, { new: true, upsert: true }).exec();
    return data.value;
  }

  async delete(db, key) {
    if (!db) return false;
    if (key) {
      this.saveLog(`deleting ${db}.${key}`);

      await this.schema.findOneAndUpdate({ key: db }, { $unset: { [`value.${key}`]: '' } }, { new: true, upsert: true }).exec();
      return true;
    }

    this.saveLog(`deleting ${db}`);

    return (await this.schema.deleteOne({ key: db }).exec()).deletedCount > 0;
  }
}

class DB extends NoCacheDB {
  async init(dbConnectionString, collection = 'db-collection', valueLoggingMaxJSONLength = 20) {
    await super.init(dbConnectionString, collection, valueLoggingMaxJSONLength);
    return this.fetchAll();
  }

  cache = new Collection();

  async fetchAll() {
    for (const { key, value } of await super.reduce()) this.cache.set(key, value);
    return this;
  }

  async fetch(db) {
    const { value } = await this.schema.findOne({ key: db }).exec() || {};
    this.cache.set(db, value);
    return value;
  }

  reduce() {
    return this.cache.reduce((acc, value, key) => acc.push({ key, value }) && acc, []);
  }

  get(db, key) {
    let data = this.cache.get(db);
    if (key) for (const objKey of key.split('.')) {
      data = data?.[objKey];
      if (data === undefined) return data;
    }

    return data;
  }

  async set(db, value, overwrite = false) {
    const data = await super.set(db, value, overwrite);

    this.cache.set(db, data);
    return data;
  }

  async update(db, key, value) {
    const data = await super.update(db, key, value);

    this.cache.set(db, data);
    return data;
  }

  push(db, key, ...value) {
    const data = super.push(db, key, ...value);
    this.cache.set(db, data);

    return data;
  }

  pushToSet(db, key, ...value) {
    const data = super.pushToSet(db, key, ...value);
    this.cache.set(db, data);

    return data;
  }

  async delete(db, key) {
    if (!db) return false;
    if (key) {
      this.saveLog(`deleting ${db}.${key}`);

      const data = await this.schema.findOneAndUpdate({ key: db }, { $unset: { [`value.${key}`]: '' } }, { new: true, upsert: true }).exec();
      this.cache.set(db, data.value);
      return true;
    }

    await super.delete(db, key);
    return this.cache.delete(db);
  }
}

module.exports = { DB, NoCacheDB, default: DB };