# Mongoose-DB
[![Activity](https://img.shields.io/github/commit-activity/m/Mephisto5558/Mongoose-DB)](https://github.com/Mephisto5558/Mongoose-DB/pulse)
[![License](https://img.shields.io/github/license/Mephisto5558/Mongoose-DB)](https://github.com/Mephisto5558/Mongoose-DB/blob/main/LICENSE)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=Mephisto5558_Mongoose-DB&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=Mephisto5558_Mongoose-DB)
[![wakatime](https://wakatime.com/badge/github/Mephisto5558/Mongoose-DB.svg)](https://wakatime.com/badge/github/Mephisto5558/Mongoose-DB)<br>
[![npm version](https://badge.fury.io/js/@mephisto5558%2Fmongoose-db.svg)](https://www.npmjs.com/package/@mephisto5558/mongoose-db)
[![npm downloads](https://img.shields.io/npm/dm/%40mephisto5558%2Fmongoose-db)](https://www.npmjs.com/package/@mephisto5558/mongoose-db)<br>
[![CodeQL](https://github.com/Mephisto5558/Mongoose-DB/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/Mephisto5558/Mongoose-DB/actions/workflows/codeql.yml)
[![ESLint](https://github.com/Mephisto5558/Mongoose-DB/actions/workflows/eslint.yml/badge.svg?branch=main)](https://github.com/Mephisto5558/Mongoose-DB/actions/workflows/eslint.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Mephisto5558_Mongoose-DB&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Mephisto5558_Mongoose-DB)<br>
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Mephisto5558_Mongoose-DB&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=Mephisto5558_Mongoose-DB)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Mephisto5558_Mongoose-DB&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Mephisto5558_Mongoose-DB)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=Mephisto5558_Mongoose-DB&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=Mephisto5558_Mongoose-DB)<br>
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=Mephisto5558_Mongoose-DB&metric=bugs)](https://sonarcloud.io/summary/new_code?id=Mephisto5558_Mongoose-DB)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=Mephisto5558_Mongoose-DB&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=Mephisto5558_Mongoose-DB)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=Mephisto5558_Mongoose-DB&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=Mephisto5558_Mongoose-DB)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=Mephisto5558_Mongoose-DB&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=Mephisto5558_Mongoose-DB)<br>

[![Discord Server](https://discordapp.com/api/guilds/725378451988676609/widget.png?style=shield)](https://discord.gg/u6xjqzz)

## DB Module for Node.js using Mongoose and MongoDB

This module provides a `DB` and a `NoCacheDB` class for MongoDB operations. The operations include:

- Establishing a connection to a MongoDB instance.
- Performing CRUD operations (Create, Read, Update, Delete).
- Caching data for performance (use the NoCacheDB if you don't want a cache).
- Logging operations and values.

## Installation
```
$ npm install @mephisto5558/mongoose-db
```

## How to Use

### 1. Import the DB Module
First, you need to import the `DB` module into your JavaScript file:

```js
const { DB } = require('@mephisto5558/mongoose-db');
// or
import { DB } from '@mephisto5558/mongoose-db'
```

### 2. Initialize a New DB Instance
Create a new instance of the `DB` class, providing a MongoDB connection string:

```js
const db = await new DB().init('<your-mongodb-connection-string>');
```

## Examples

### Fetch All Data
Fetch all data from the database and cache it:<br>
Note that this is done automatically after creating a new instance.

```js
await db.fetchAll();
console.log('All data fetched');
```

### Fetch a Specific Collection
Fetch a specific collection from the database and cache it:

```js
const data = await db.fetch('collection')
console.log('Fetched data:', data);
```

### Get a Value from the Cache
```js
const value = db.get('collection', 'key');
console.log('Value:', value);
```

`key` can be a flattened key:

Value in Mongodb:
```json
{
  "key": "collection",
  "value": {
    "key": {
      "subkey1": {
        "subkey2": "value"
      }
    }
  }
}
```
JS code:
```js
const value = db.get('collection', 'key.subkey1.subkey2')
```

### Set a Value in a Collection
Set a value in a specific collection, with an option to overwrite existing data:<br>
It is strongly suggested to use `DB#update` instead.

```js
const newValue = db.set('collection', 'value', true);
console.log('New value:', newValue);
```

### Update a Specific Value in a Collection
Update a specific value in a specific collection:<br>
The key can be flattend, see `DB#get` for more information.

```js
const updatedValue = db.update('collection', 'key', 'new-value').
console.log('Updated value:', updatedValue);
```

### Add a Value to a Collection
Add a value to an array, with an option to prevent duplicate entries (using a set in MongoDB):<br>
The key can be flattend, see `DB#get` for more information.

```js
const updatedArray = db.push('collection', 'key', 'value');
console.log('Updated collection:', updatedCollection);
```

### Delete a Value or a Whole Collection
Delete a specific value or a whole collection, if no key is provided. This returns false if the key did not exist:<br>
The key can be flattend, see `DB#get` for more information.

```js
const success = db.delete('collection', 'key');
console.log('Deletion successfull:', success);
```
