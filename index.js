const
  Mongoose = require('mongoose').default.set('strictQuery', true),
  { Collection } = require('@discordjs/collection'),
  DEFAULT_VALUE_LOGGING_MAX_JSONLENGTH = 20;

class NoCacheDB {
  /**
   * @type {import('.').NoCacheDB['init']}
   * @this {this}
   **/
  async init(dbConnectionString, collection = 'db-collections', valueLoggingMaxJSONLength = DEFAULT_VALUE_LOGGING_MAX_JSONLENGTH, debugLoggingFunction = console.debug) {
    if (Mongoose.connection.readyState != Mongoose.ConnectionStates.connected) {
      if (!dbConnectionString) throw new Error('A Connection String is required!');
      await Mongoose.connect(dbConnectionString);
    }

    this.schema = Mongoose.model(collection, new Mongoose.Schema({
      key: String,
      value: Mongoose.SchemaTypes.Mixed
    }));

    this.#logDebug = debugLoggingFunction;

    if (valueLoggingMaxJSONLength === false) this.valueLoggingMaxJSONLength = 0;
    else this.valueLoggingMaxJSONLength = Number.isNaN(valueLoggingMaxJSONLength) ? DEFAULT_VALUE_LOGGING_MAX_JSONLENGTH : valueLoggingMaxJSONLength;
  }

  /** @type {(...str: any[]) => unknown} */
  #logDebug;

  /**
   * @type {import('.').NoCacheDB['saveLog']}
   * @this {this}
   **/
  saveLog(msg, value) {
    const jsonValue = JSON.stringify(value);
    this.#logDebug(msg + (jsonValue && this.valueLoggingMaxJSONLength >= jsonValue.length ? `, value: ${jsonValue}` : ''));
    return this;
  }

  /** @type {import('.').NoCacheDB['reduce']} */
  async reduce() {
    return this.schema.find().select('key value -_id').exec();
  }

  /** @type {import('.').NoCacheDB['get']} */
  async get(db, key) {
    let data = (await this.schema.findOne({ key: db }).exec())?.value;
    if (key) {
      for (const objKey of key.split('.')) {
        data = data?.[objKey];
        if (data === undefined) return data;
      }
    }

    return data;
  }

  /**
   * @type {import('.').NoCacheDB['set']}
   * @param {string | undefined} db */
  async set(db, value, overwrite = false) {
    if (!db) return;

    this.saveLog(`setting collection ${db}, ${overwrite ? 'overwriting existing data' : ''}`, value);

    const update = { $set: { value } };
    if (!overwrite) update.$setOnInsert = { key: db };

    const data = await this.schema.findOneAndUpdate({ key: db }, update, { new: true, upsert: true }).exec();
    return data.value;
  }

  /** @type {import('.').NoCacheDB['update']} */
  async update(db, key, value) {
    if (!key) return;

    this.saveLog(`updating ${db}.${key}`, value);

    const data = await this.schema.findOneAndUpdate({ key: db }, { $set: { [`value.${key}`]: value } }, { new: true, upsert: true }).exec();
    return data.value;
  }

  /**
   * @type {import('.').NoCacheDB['push']}
   * @this {this}
   **/
  async push(db, key, ...value) { return this.#push(false, db, key, ...value); }

  /**
   * @type {import('.').NoCacheDB['pushToSet']}
   * @this {this}
   **/
  async pushToSet(db, key, ...value) { return this.#push(true, db, key, ...value); }

  /**
   * @param {boolean} set If true, there will be no duplicates
   * @param {string} db
   * @param {string} key
   * @param {any[]} value */
  async #push(set, db, key, ...value) {
    const values = value.length == 1 && Array.isArray(value[0]) ? value[0] : value;
    if (!db || !values.length) return;

    this.saveLog(`pushing data to ${db}.${key}`, values);

    const data = await this.schema.findOneAndUpdate({ key: db }, { [set ? '$addToSet' : '$push']: { [`value.${key}`]: { $each: values } } }, { new: true, upsert: true }).exec();
    return data.value;
  }

  /** @type {import('.').NoCacheDB['delete']} */
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

  valueOf() {
    return this.constructor.name; // for discord.js flatten function
  }
}

class DB extends NoCacheDB {
  /** @type {import('.').DB['init']} */
  async init(dbConnectionString, collection = 'db-collection', valueLoggingMaxJSONLength = DEFAULT_VALUE_LOGGING_MAX_JSONLENGTH, debugLoggingFunction = console.debug) {
    await super.init(dbConnectionString, collection, valueLoggingMaxJSONLength, debugLoggingFunction);
    return this.fetchAll();
  }

  /** @type {import('.').DB['cache']} */
  cache = new Collection();

  /** @type {import('.').DB['fetchAll']} */
  async fetchAll() {
    for (const { key, value } of await super.reduce()) this.cache.set(key, value);
    return this;
  }

  /** @type {import('.').DB['fetch']} */
  async fetch(db) {
    const { value } = await this.schema.findOne({ key: db }).exec() ?? {};
    this.cache.set(db, value);
    return value;
  }

  /** @type {import('.').DB['reduce']} */
  reduce() {
    return this.cache.reduce((acc, value, key) => acc.push({ key, value }) && acc, []);
  }

  /** @type {import('.').DB['get']} */
  get(db, key) {
    let data = this.cache.get(db);
    if (key) {
      for (const objKey of key.split('.')) {
        data = data?.[objKey];
        if (data === undefined) return data;
      }
    }

    return data;
  }

  /** @type {import('.').DB['set']} */
  async set(db, value, overwrite = false) {
    const data = await super.set(db, value, overwrite);

    this.cache.set(db, data);
    return data;
  }

  /** @type {import('.').DB['update']} */
  async update(db, key, value) {
    const data = await super.update(db, key, value);

    this.cache.set(db, data);
    return data;
  }

  /** @type {import('.').DB['push']} */
  async push(db, key, ...value) {
    const data = await super.push(db, key, ...value);
    this.cache.set(db, data);

    return data;
  }

  /** @type {import('.').DB['pushToSet']} */
  async pushToSet(db, key, ...value) {
    const data = await super.pushToSet(db, key, ...value);
    this.cache.set(db, data);

    return data;
  }

  /** @type {import('.').DB['delete']} */
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