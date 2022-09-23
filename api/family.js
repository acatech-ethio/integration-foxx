'use strict';
const dd = require('dedent');
const joi = require('joi');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');

const familyItemSchema = {
  _key: joi.string(),
  // Describe the attributes for outgoing familyItems
  // e.g. age: joi.number().integer()
};

const familyItemIncomingSchema = {
  _from: joi.string(),
  _to: joi.string(),
  // Describe the attributes for incoming familyItems
};

const familyItemPatchSchema = {
  // Describe the attributes the patch route should accept here
};

const familyItems = module.context.collection('family');
const keySchema = joi.string().required()
.description('The key of the familyItem');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;

const router = createRouter();
module.exports = router;

router.get(function (req, res) {
  res.send(familyItems.all());
}, 'list')
.response([familyItemSchema], 'A list of familyItems.')
.summary('List all familyItems')
.description(dd`
  Retrieves a list of all familyItems.
`);

router.post(function (req, res) {
  const familyItem = req.body;
  let meta;
  try {
    meta = familyItems.save(familyItem);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      res.throw('conflict', e.message);
    }
    res.throw(e);
  }
  Object.assign(familyItem, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: familyItem._key})
  ));
  res.send(familyItem);
}, 'create')
.body(familyItemIncomingSchema, 'The familyItem to create.')
.response(201, familyItemSchema, 'The created familyItem.')
.error('conflict', 'The familyItem already exists.')
.summary('Create a new familyItem')
.description(dd`
  Creates a new familyItem from the request body and
  returns the saved familyItem.
`);

router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let familyItem
  try {
    familyItem = familyItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      res.throw('not found', e.message);
    }
    res.throw(e);
  }
  res.send(familyItem);
}, 'detail')
.pathParam('key', keySchema)
.response(familyItemSchema, 'The familyItem.')
.summary('Fetch a familyItem')
.description(dd`
  Retrieves a familyItem by its key.
`);

router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const familyItem = req.body;
  let meta;
  try {
    meta = familyItems.replace(key, familyItem);
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
  Object.assign(familyItem, meta);
  res.send(familyItem);
}, 'replace')
.pathParam('key', keySchema)
.body(familyItemIncomingSchema, 'The data to replace the familyItem with.')
.response(familyItemSchema, 'The new familyItem.')
.summary('Replace a familyItem')
.description(dd`
  Replaces an existing familyItem with the request body and
  returns the new familyItem.
`);

router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let familyItem;
  try {
    familyItems.update(key, patchData);
    familyItem = familyItems.document(key);
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
  res.send(familyItem);
}, 'update')
.pathParam('key', keySchema)
.body(familyItemPatchSchema, 'The data to update the familyItem with.')
.response(familyItemSchema, 'The updated familyItem.')
.summary('Update a familyItem')
.description(dd`
  Patches a familyItem with the request body and
  returns the updated document.
`);

router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    familyItems.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      res.throw('not found', e.message);
    }
    res.throw(e);
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a familyItem')
.description(dd`
  Deletes a familyItem from the database.
`);
