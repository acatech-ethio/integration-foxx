'use strict';
const db = require('@arangodb').db;
const allCollections = [
  "land",
  "resources",
  "services",
  "family",
  "ministry"
];

for (const name of allCollections) {
  const prefixedName = module.context.collectionName(name);
  db._drop(prefixedName);
}
