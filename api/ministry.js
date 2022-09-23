'use strict';
const dd = require('dedent');
const joi = require('joi');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');

const ministryItemSchema = {
  _key: joi.string(),
  // Describe the attributes for outgoing ministryItems
  // e.g. age: joi.number().integer()
};

const ministryItemIncomingSchema = {
  _from: joi.string(),
  _to: joi.string(),
  // Describe the attributes for incoming ministryItems
};

const ministryItemPatchSchema = {
  // Describe the attributes the patch route should accept here
};

const ministryItems = module.context.collection('ministry');
const keySchema = joi.string().required()
.description('The key of the ministryItem');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;

const router = createRouter();
module.exports = router;

router.get(function (req, res) {
  res.send(ministryItems.all());
}, 'list')
.response([ministryItemSchema], 'A list of ministryItems.')
.summary('List all ministryItems')
.description(dd`
  Retrieves a list of all ministryItems.
`);

router.post(function (req, res) {
  const ministryItem = req.body;
  let meta;
  try {
    meta = ministryItems.save(ministryItem);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      res.throw('conflict', e.message);
    }
    res.throw(e);
  }
  Object.assign(ministryItem, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: ministryItem._key})
  ));
  res.send(ministryItem);
}, 'create')
.body(ministryItemIncomingSchema, 'The ministryItem to create.')
.response(201, ministryItemSchema, 'The created ministryItem.')
.error('conflict', 'The ministryItem already exists.')
.summary('Create a new ministryItem')
.description(dd`
  Creates a new ministryItem from the request body and
  returns the saved ministryItem.
`);

router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let ministryItem
  try {
    ministryItem = ministryItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      res.throw('not found', e.message);
    }
    res.throw(e);
  }
  res.send(ministryItem);
}, 'detail')
.pathParam('key', keySchema)
.response(ministryItemSchema, 'The ministryItem.')
.summary('Fetch a ministryItem')
.description(dd`
  Retrieves a ministryItem by its key.
`);

router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const ministryItem = req.body;
  let meta;
  try {
    meta = ministryItems.replace(key, ministryItem);
  } catch (e) {
    if (e.isArangoError) {
      if (e.errorNum === ARANGO_NOT_FOUND) {
        res.throw('not found', e.message);
      } else if (e.errorNum === ARANGO_CONFLICT) {
        res.throw('conflict', e.message);
      }
    }
    res.throw(e);
  }
  Object.assign(ministryItem, meta);
  res.send(ministryItem);
}, 'replace')
.pathParam('key', keySchema)
.body(ministryItemIncomingSchema, 'The data to replace the ministryItem with.')
.response(ministryItemSchema, 'The new ministryItem.')
.summary('Replace a ministryItem')
.description(dd`
  Replaces an existing ministryItem with the request body and
  returns the new ministryItem.
`);

router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let ministryItem;
  try {
    ministryItems.update(key, patchData);
    ministryItem = ministryItems.document(key);
  } catch (e) {
    if (e.isArangoError) {
      if (e.errorNum === ARANGO_NOT_FOUND) {
        res.throw('not found', e.message);
      }
      if (e.errorNum === ARANGO_CONFLICT) {
        res.throw('conflict', e.message);
      }
    }
    res.throw(e);
  }
  res.send(ministryItem);
}, 'update')
.pathParam('key', keySchema)
.body(ministryItemPatchSchema, 'The data to update the ministryItem with.')
.response(ministryItemSchema, 'The updated ministryItem.')
.summary('Update a ministryItem')
.description(dd`
  Patches a ministryItem with the request body and
  returns the updated document.
`);

router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    ministryItems.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      res.throw('not found', e.message);
    }
    res.throw(e);
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a ministryItem')
.description(dd`
  Deletes a ministryItem from the database.
`);
