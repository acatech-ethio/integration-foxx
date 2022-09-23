'use strict';
const dd = require('dedent');
const joi = require('joi');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');

const resourceSchema = {
  _key: joi.string(),
  // Describe the attributes for outgoing resources
  // e.g. age: joi.number().integer()
};

const resourceIncomingSchema = {
  // Describe the attributes for incoming resources
};

const resourcePatchSchema = {
  // Describe the attributes the patch route should accept here
};

const resources = module.context.collection('resources');
const keySchema = joi.string().required()
.description('The key of the resource');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;

const router = createRouter();
module.exports = router;

router.get(function (req, res) {
  res.send(resources.all());
}, 'list')
.response([resourceSchema], 'A list of resources.')
.summary('List all resources')
.description(dd`
  Retrieves a list of all resources.
`);

router.post(function (req, res) {
  const resource = req.body;
  let meta;
  try {
    meta = resources.save(resource);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      res.throw('conflict', e.message);
    }
    res.throw(e);
  }
  Object.assign(resource, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: resource._key})
  ));
  res.send(resource);
}, 'create')
.body(resourceIncomingSchema, 'The resource to create.')
.response(201, resourceSchema, 'The created resource.')
.error('conflict', 'The resource already exists.')
.summary('Create a new resource')
.description(dd`
  Creates a new resource from the request body and
  returns the saved resource.
`);

router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let resource
  try {
    resource = resources.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      res.throw('not found', e.message);
    }
    res.throw(e);
  }
  res.send(resource);
}, 'detail')
.pathParam('key', keySchema)
.response(resourceSchema, 'The resource.')
.summary('Fetch a resource')
.description(dd`
  Retrieves a resource by its key.
`);

router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const resource = req.body;
  let meta;
  try {
    meta = resources.replace(key, resource);
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
  Object.assign(resource, meta);
  res.send(resource);
}, 'replace')
.pathParam('key', keySchema)
.body(resourceIncomingSchema, 'The data to replace the resource with.')
.response(resourceSchema, 'The new resource.')
.summary('Replace a resource')
.description(dd`
  Replaces an existing resource with the request body and
  returns the new resource.
`);

router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let resource;
  try {
    resources.update(key, patchData);
    resource = resources.document(key);
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
  res.send(resource);
}, 'update')
.pathParam('key', keySchema)
.body(resourcePatchSchema, 'The data to update the resource with.')
.response(resourceSchema, 'The updated resource.')
.summary('Update a resource')
.description(dd`
  Patches a resource with the request body and
  returns the updated document.
`);

router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    resources.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      res.throw('not found', e.message);
    }
    res.throw(e);
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a resource')
.description(dd`
  Deletes a resource from the database.
`);
