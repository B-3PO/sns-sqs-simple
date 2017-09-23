# sns-sqs-simple
A simple and elegant wrapper for AWS SNS and SQS


# documentation
  [Documentation Web Page](https://b-3po.github.io/sns-sqs-simple/)

# Run locally
To use sqs and sns locally you have many options. Here are 2 options i have used
- [goaws](https://github.com/p4tin/goaws)
- [Mock Tool](https://www.npmjs.com/package/aws-sdk-mock)

# Usage

## Example
In this example we will subscribe a topic to a queue, publish messages to it, and process them.

```javascript
const snssqs = require('sns-sqs-simple');
let counter = 0;

// publish sns message to a queue
snssqs.subscribe('channel1', startPublishing);

function startPublishing(err) {
  if (err) throw err;

  setInterval(() => {
    snssqs.publish('channel1', {
      message: 'Hello World',
      someValue: true,
      count: counter++
    });
  }, 1000);

  snssqs.poll('channel1', (err, message, done) => {
    if (err) throw err;

    processMessage();
    function processMessage() {
      console.log('message:', message);
      setTimeout(done, 2000);
    }
  });
}
```



## config
setup aws config
You can skip this step if you already have credentials setup for aws-sdk
```javascript
// set env variables
process.env.AWS_KEY = 'AKID';
process.env.AWS_SECRET = 'SECRET';
process.env.AWS_REGION = 'us-east-1';
process.env.SQS_ENDPOINT = 'http://localhost:4100';
```

## subscribe
Subscribe a topic to a queue
```javascript
const snssqs = require('sns-sqs-simple');

// auto generate queue name using topic
snssqs.subscribe('channel1', (err, subscriptionArn) => {
  // Topic "channel1" is subscribed to queue "channel1"
});

// chooses queue name
snssqs.subscribe('channel1', 'queue1', (err, subscriptionArn) => {
  // Topic "channel1" is subscribed to queue "queue1"
});
```


## publish
Publish a message to a topic
```javascript
const snssqs = require('sns-sqs-simple');

// publish sns message
snssqs.publish('channel1', {
  some: 'data',
  goes: 'here'
});

// publish sns message to a queue
snssqs.subscribe('channel1', (err, subscriptionArn) => {
  snssqs.publish('channel1', {
    some: 'data',
    goes: 'here'
  });
});
```


## poll
Poll queue for messages
```javascript
const snssqs = require('sns-sqs-simple');

// poll queue
snssqs.poll('channel1', (err, message, done) => {
  if (err) { // could not poll }
  processMessage();
  function processMessage() {
    setTimeout(done, 2000);
  }
});

// change settings
let settings = {
  MaxNumberOfMessages: 10,
  repollTime: 10000,
  VisibilityTimeout: 10,
  WaitTimeSeconds: 10
};
snssqs.poll('channel1', settings, (err, message, done) => {
  if (err) { // could not poll }
  processMessage();
  function processMessage() {
    setTimeout(done, 2000);
  }
});
```
