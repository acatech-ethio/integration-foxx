'use strict';

module.context.use('/resources', require('./api/resources'), 'resources');
module.context.use('/services', require('./api/services'), 'services');
module.context.use('/land', require('./api/land'), 'land');
module.context.use('/family', require('./api/family'), 'family');
module.context.use('/ministry', require('./api/ministry'), 'ministry');
