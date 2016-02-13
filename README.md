# parse-to-anh
Node.js module and tool to migrate android and ios users from parse to Azure Notification Hubs.
The script updates the `_Installation` collection with a new property `anhRegistrationId` that can later be used to send puah notifications for the user.

Sending a notification to a user is done by sending a notification to a tag of the user's `anhRegistrationId`. Example below.

In addition, you can provide a handler function that will get the RegistrationId and run your own logic. 
For example, if you wish to save this registrationId in another collection, or provision it against an addition API.

# First thing first
* First you'll need to export Parse db to your own mongo db instance. Deatils [here](https://parse.com/docs/server/guide#database).
* Create an Azure Notification Hub as explained [here](https://azure.microsoft.com/en-us/documentation/services/notification-hubs/).


# Usage- As a Tool

```
npm install parse-to-anh -g
```

Create a configuration file: `config.json`:

```
{
  "mongoUrl": "yourMongoUrl",
  "hubName": "yourAzureHubName",
  "hubConnection": "yourAzureHubConnectionString",
  "tags": [],
  "reRegister": true,
  "batchSize": 100,
  "limit": 0
}
```

## options

* `mongoUrl`- The Url for your mongo db that was migrated from parse
* `hubName`- The Azure Notification Hub name
* `hubConnection`- The Azure Notification Hub connection string
* `tags`- Default list of tags that will be added to the user
* `reRegister`- [Optional, default `false`] ReRegister users that were already registered. This can be used if for some reason you run the script again on a db that was only partially processed.
* `batchSize`- [Optional] The size of the batch used by mongo client
* `limit`- [Optional] Use that to limit the number of items to process. Can be used to test with a small amount of items, before processing the whole collection.

* `registrationHandler`- [Optional]- a callback function that gets an `_Installation` document containing the new `anhRegistrationId` field. This handler will be called for each successfull user registration. This is the place for you to add your own custom code to handle the registrationId.

## Executing
run:
```
parse-to-anh config.json
```

Grab some coffee and relax...

# Usage- As a module

Check the [sample](sample/index.js) file for a reference

```
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
  return cb();
}

console.log('starting registering to Azure Notification Hub...');

migrator.start(config, function (err) {
  if (err) return console.error('error occurred:', err);
  console.log('migration completed successfully');
});

```

## Sending a notification to a user from your node.js server

Use the `anhRegistrationId` to send a notification to the user. 
The below example assumes an `ios` user, using `apns` to send the notification:

```
var azure = require('azure');
var hubService = azure.createNotificationHubService(hubName, hubConn);

var payload = {
  alert: 'Hello from Azure Notification Hubs!'
};

var tags = [anhRegistrationId];

hubService.apns.send(tags, payload, function (err) {
    if (err) return console.error('error sending notification', err);
    console.log('Success: notification sent');
});
```


## Notes
* Currently supports ios and android
* Failed users will not stop the process. An error log will be sent to the console. 

**Note for Android users**- One thing you should be aware of is that Parse uses their own GCM SenderId to send push notification to android users. The intention was to hide the hassle of on-boarding with Google Push Notification service. For you to be able to migrate these users, you'll need to follow [these](https://parse.com/docs/server/guide#migrating) instructions (look for "Exporting GCM Registration IDs"), to create your own SenderId and to update your existing app to register the devices against Google, so that on migration time, the token will match your SenderId. **This should be done ASAP**- so that hopefully most of your users will get the app update and will register with your SenderId.

# License
[MIT](LICENSE)
