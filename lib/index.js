

var MongoClient = require('mongodb').MongoClient;
var anh = require('./anh');

function start(opts, cb) {
  if (!cb || typeof cb !== 'function') throw new Error('callback was not provided');
  opts = opts || {};
  
  if (!opts.mongoUrl) return cb(new Error('mongoUrl was not provided'));
  opts.batchSize = opts.batchSize || 2;

  var registrationHandler = opts.registrationHandler;
  if (registrationHandler && typeof registrationHandler !== 'function')
    throw new Error('registrationHandler is not a function');

  anh.init(opts, function (err, hubClient) {
    if (err) return cb(err);
    
    MongoClient.connect(opts.mongoUrl, function(err, db) {
      if (err) return cb(err);

      var collection = db.collection('_Installation');
      var projection = { deviceType: 1, 
        _p_user: 1, 
        deviceToken: 1,
        anhRegistrationId: 1
      };
      
      var condition = {};
      if (!opts.reRegister) {
        condition["anhRegistrationId"] = null;
      }
      var count = 0;
      
      var limit = opts.limit || 0;
      
      var cursor = collection
        .find(condition, projection)
        .batchSize(opts.batchSize)
        .limit(limit)
        .addCursorFlag('noCursorTimeout', true);
        
      return iterate();
      
      function done(err) {
        db.close();
        if (err) return cb(err);
        console.log('finished processing', count, 'users');
      }
      
      function iterate() {
        cursor.hasNext(function (err, hasNext) {
          if (err) return done(err);
          if (hasNext) {
            cursor.next(function (err, doc) {
              if (err) return cb(err);
              count++;
              return process(doc, function (err) {
                if (err) return done(err);
                return iterate();
              });
            });
          }
          else {
            //console.log('no more docs in this cursor');
            return done();
          }
        });
      }
      
      function process(doc, cb) {
        console.log('\ncalling register for installation Id:', doc._id);
        return hubClient.register({
            doc: doc
          },
          function (err, result) {
            if (err) {
              console.warn('there was an error subscribing user, continuing to the next one', doc, err);
              // we don't want to propogate the error
              return cb(); 
            };
            
            console.log('user subscribed with registrationId %s', result.registrationId);
            return updateRegistrationId(doc, result.registrationId, function (err) { 
              if (err) {
                console.warn('there was an error updating user registrationId in the db', doc, err);
                
                // in this case we have an issue with the db, we want to 
                // propogate the error and stop the processing
                return cb(err); 
              };
              
              console.log('user registrationId updated successfully in db');
              
              if (registrationHandler) return registrationHandler(doc, cb);

              return cb();
            });
            
          }
        );
      }
      
      function updateRegistrationId(doc, registrationId, cb) {
        
        if(doc.anhRegistrationId) {
          // this is re-registration with the same
          // anhRegistrationId- no need to update
          return cb();
        }
        
        return collection.updateOne(
          { "_id" : doc._id },
          {
            $set: { "anhRegistrationId": registrationId },
            $currentDate: { "lastModified": true }
          }, cb
        );
      }
    });
  });
}


module.exports = {
  start: start
};