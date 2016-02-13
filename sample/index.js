
var migrator = require('parse-to-anh');
var config = {
  "mongoUrl": "yourMongoUrl",
  "hubName": "yourAzureHubName",
  "hubConnection": "yourAzureHubConnectionString",
  "tags": [],
  "reRegister": true,
  "batchSize": 100,
  "limit": 0,
  "registrationHandler": myHandler
};


function myHandler(installation, cb) {
  // TODO: custom code to use installation.anhRegistrationId 
  // and the rest of the properties of the installation document
  console.log('installation', installation);
  return cb();
}

console.log('starting registering to Azure Notification Hub...');

migrator.start(config, function (err) {
  if (err) return console.error('error occurred:', err);
  console.log('migration completed successfully');
});