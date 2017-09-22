// TODO remove env vars
process.env.AWS_KEY = 'AKID';
process.env.AWS_SECRET = 'SECRET';
process.env.AWS_REGION = 'us-east-1';
process.env.SQS_ENDPOINT = 'http://localhost:4100';

const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: process.env.AWS_REGION,
  endpoint: process.env.SQS_ENDPOINT
});

module.exports = require('./lib/events');
