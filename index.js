const AWS = require('aws-sdk');
let config = {};
if (process.env.AWS_KEY) config.accessKeyId = process.env.AWS_KEY;
if (process.env.AWS_SECRET) config.secretAccessKey = process.env.AWS_SECRET;
if (process.env.AWS_REGION) config.region = process.env.AWS_REGION;
if (process.env.SQS_ENDPOINT) config.endpoint = process.env.SQS_ENDPOINT;
if (Object.keys(config).length) AWS.config.update(config);
const events = require('./lib/events');

module.exports = {
  SQS: require('./lib/sqs'),
  SNS: require('./lib/sns'),
  subscribe: events.subscribe,
  publish: events.publish,
  poll: events.poll
};
