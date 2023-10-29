# README.md

## DB Module for Node.js using Mongoose and MongoDB

This module provides a `DB` class for MongoDB operations. The operations include:

- Establishing a connection to a MongoDB instance.
- Performing CRUD operations (Create, Read, Update, Delete).
- Caching data for performance.
- Logging operations and values.

## Installation
```
$ npm install @mephisto5558/mongoose-db
```

## How to Use

### 1. Import the DB Module
First, you need to import the `DB` module into your JavaScript file:

```js
const DB = require('@mephisto5558/mongoose-db');
```

### 2. Initialize a New DB Instance
Create a new instance of the `DB` class, providing a MongoDB connection string:

```js
const db = new DB('<your-mongodb-connection-string>');
```

### 3. Fetch All Data
Fetch all data from the database and cache it:<br>
Note that this is done automatically after creating a new instance.

```js
await db.fetchAll();
console.log('All data fetched');
```

### 4. Fetch a Specific Collection
Fetch a specific collection from the database and cache it:

```js
const data = await db.fetch('collection')
console.log('Fetched data:', data);
```

### 5. Get a Value from the Cache
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

### 6. Set a Value in a Collection
Set a value in a specific collection, with an option to overwrite existing data:<br>
It is strongly suggested to use `DB#update` instead.

```js
const newValue = db.set('collection', 'value', true);
console.log('New value:', newValue);
```

### 7. Update a Specific Value in a Collection
Update a specific value in a specific collection:<br>
The key can be flattend, see `DB#get` for more information.

```js
const updatedValue = db.update('collection', 'key', 'new-value').
console.log('Updated value:', updatedValue);
```

### 8. Add a Value to a Collection
Add a value to an array, with an option to prevent duplicate entries (using a set in MongoDB):<br>
The key can be flattend, see `DB#get` for more information.

```js
const updatedArray = db.push('collection', 'key', 'value');
console.log('Updated collection:', updatedCollection);
```

### 9. Delete a Value or a Whole Collection
Delete a specific value or a whole collection, if no key is provided. This returns false if the key did not exist:<br>
The key can be flattend, see `DB#get` for more information.

```js
const success = db.delete('collection', 'key');
console.log('Deletion successfull:', success);
```
