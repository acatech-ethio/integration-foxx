'use strict';
const dd = require('dedent');
const joi = require('joi');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');

const serviceSchema = {
  _key: joi.string(),
  // Describe the attributes for outgoing services
  // e.g. age: joi.number().integer()
};

const serviceIncomingSchema = {
  // Describe the attributes for incoming services
};

const servicePatchSchema = {
  // Describe the attributes the patch route should accept here
};

const services = module.context.collection('services');
const keySchema = joi.string().required()
.description('The key of the service');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;

const router = createRouter();
module.exports = router;

router.get(function (req, res) {
  res.send(services.all());
}, 'list')
.response([serviceSchema], 'A list of services.')
.summary('List all services')
.description(dd`
  Retrieves a list of all services.
`);

router.post(function (req, res) {
  const service = req.body;
  let meta;
  try {
    meta = services.save(service);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      res.throw('conflict', e.message);
    }
    res.throw(e);
  }
  Object.assign(service, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: service._key})
  ));
  res.send(service);
}, 'create')
.body(serviceIncomingSchema, 'The service to create.')
.response(201, serviceSchema, 'The created service.')
.error('conflict', 'The service already exists.')
.summary('Create a new service')
.description(dd`
  Creates a new service from the request body and
  returns the saved service.
`);

router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let service
  try {
    service = services.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      res.throw('not found', e.message);
    }
    res.throw(e);
  }
  res.send(service);
}, 'detail')
.pathParam('key', keySchema)
.response(serviceSchema, 'The service.')
.summary('Fetch a service')
.description(dd`
  Retrieves a service by its key.
`);

router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const service = req.body;
  let meta;
  try {
    meta = services.replace(key, service);
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
  Object.assign(service, meta);
  res.send(service);
}, 'replace')
.pathParam('key', keySchema)
.body(serviceIncomingSchema, 'The data to replace the service with.')
.response(serviceSchema, 'The new service.')
.summary('Replace a service')
.description(dd`
  Replaces an existing service with the request body and
  returns the new service.
`);

router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let service;
  try {
    services.update(key, patchData);
    service = services.document(key);
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
  res.send(service);
}, 'update')
.pathParam('key', keySchema)
.body(servicePatchSchema, 'The data to update the service with.')
.response(serviceSchema, 'The updated service.')
.summary('Update a service')
.description(dd`
  Patches a service with the request body and
  returns the updated document.
`);

router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    services.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      res.throw('not found', e.message);
    }
    res.throw(e);
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a service')
.description(dd`
  Deletes a service from the database.
`);
