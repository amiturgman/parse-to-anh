var azure = require('azure');

var hubService, defaultTags;

function registerIOS(doc, cb) {
  var token = doc.deviceToken;
  if (!token) return cb(new Error('device does not have a token: ' + JSON.stringify(doc)));

  return getRegistrationId(doc, function (err, registrationId) {
    if (err) return cb(err);
    
    var tags = defaultTags.concat([registrationId]);
    return hubService.apns.createOrUpdateNativeRegistration(
      registrationId,
      token,
      tags,
      function (err) {
        return cb(err, registrationId);
      }
    );
  });
}

function registerAndroid(doc, cb) {
  var gcmRegistrationId = doc.deviceToken;
  if (!gcmRegistrationId) return cb(new Error('device does not have a token (gcmRegistrationId): ' + JSON.stringify(doc)));

  return getRegistrationId(doc, function (err, registrationId) {
    if (err) return cb(err);
    
    var tags = defaultTags.concat([registrationId]);
    return hubService.gcm.createOrUpdateNativeRegistration(
      registrationId,
      gcmRegistrationId,
      tags,
      function (err) {
        return cb(err, registrationId);
      }
    );
  });
}

var registerHandlers = {
  ios: registerIOS,
  android: registerAndroid
};

function getRegistrationId(doc, cb) {
  var registrationId = doc.anhRegistrationId;

    // if we already have a registration Id- that means that 
    // we're running this code again for this user, let's
    // update registration with the same registration Id
    if (registrationId) {
      //console.log('user already have registrationId', registrationId);
      return cb(null, registrationId);
    }
    
    // if we don't already have registrationId, let's create a new one
    //console.log('creating a new registrationId');
    return hubService.createRegistrationId(function (err, registrationId, response) {
        if (err) return cb(err);
        return cb(null, registrationId);
    });
}

function init(opts, cb) {
  
  if (!opts.hubName) return cb(new Error('hubName was not provided'));
  if (!opts.hubConnection) return cb(new Error('hubConnection was not provided'));
  
  var hubName = opts.hubName;
  var hubConn = opts.hubConnection;
  defaultTags = opts.tags || [];
  
  hubService = azure.createNotificationHubService(hubName, hubConn);
      
  function register(opts, cb) {
    var doc = opts.doc;

    var handler = registerHandlers[doc.deviceType];
    if (handler)
      return handler(doc,
        function (err, registrationId) { 
          if (err) return cb(err);
          return cb(null, { registrationId: registrationId });
        }
      );
    
    // this device registration is not supported
    return cb(new Error('device type' + doc.deviceType + 'is not suppported'));
  }
  
  var clientApi = {
      register: register
    };
  
  return cb(null, clientApi);
}

module.exports = {
  init: init
};