'use strict';
const dd = require('dedent');
const joi = require('joi');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');

const landItemSchema = {
  _key: joi.string(),
  // Describe the attributes for outgoing landItems
  // e.g. age: joi.number().integer()
};

const landItemIncomingSchema = {
  // Describe the attributes for incoming landItems
};

const landItemPatchSchema = {
  // Describe the attributes the patch route should accept here
};

const landItems = module.context.collection('land');
const keySchema = joi.string().required()
.description('The key of the landItem');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;

const router = createRouter();
module.exports = router;

router.get(function (req, res) {
  res.send(landItems.all());
}, 'list')
.response([landItemSchema], 'A list of landItems.')
.summary('List all landItems')
.description(dd`
  Retrieves a list of all landItems.
`);

router.post(function (req, res) {
  const landItem = req.body;
  let meta;
  try {
    meta = landItems.save(landItem);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      res.throw('conflict', e.message);
    }
    res.throw(e);
  }
  Object.assign(landItem, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: landItem._key})
  ));
  res.send(landItem);
}, 'create')
.body(landItemIncomingSchema, 'The landItem to create.')
.response(201, landItemSchema, 'The created landItem.')
.error('conflict', 'The landItem already exists.')
.summary('Create a new landItem')
.description(dd`
  Creates a new landItem from the request body and
  returns the saved landItem.
`);

router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let landItem
  try {
    landItem = landItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      res.throw('not found', e.message);
    }
    res.throw(e);
  }
  res.send(landItem);
}, 'detail')
.pathParam('key', keySchema)
.response(landItemSchema, 'The landItem.')
.summary('Fetch a landItem')
.description(dd`
  Retrieves a landItem by its key.
`);

router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const landItem = req.body;
  let meta;
  try {
    meta = landItems.replace(key, landItem);
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
  Object.assign(landItem, meta);
  res.send(landItem);
}, 'replace')
.pathParam('key', keySchema)
.body(landItemIncomingSchema, 'The data to replace the landItem with.')
.response(landItemSchema, 'The new landItem.')
.summary('Replace a landItem')
.description(dd`
  Replaces an existing landItem with the request body and
  returns the new landItem.
`);

router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let landItem;
  try {
    landItems.update(key, patchData);
    landItem = landItems.document(key);
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
  res.send(landItem);
}, 'update')
.pathParam('key', keySchema)
.body(landItemPatchSchema, 'The data to update the landItem with.')
.response(landItemSchema, 'The updated landItem.')
.summary('Update a landItem')
.description(dd`
  Patches a landItem with the request body and
  returns the updated document.
`);

router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    landItems.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      res.throw('not found', e.message);
    }
    res.throw(e);
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a landItem')
.description(dd`
  Deletes a landItem from the database.
`);
