const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const {
  getQueueUrl,
  getQueues
} = require('./sqs');


exports.subscribe = (topic, queue, callback) => {
  queue = queue || topic;
  let errored = false;
  let topicArn;
  let queueUrl;

  getQueueUrl(queue, (err, url) => {
    if (err && !errored) {
      errored = true;
      return callback(err);
    }
    queueUrl = url;
    done();
  });

  getTopicArn(topic, (err, arn) => {
    if (err && !errored) {
      errored = true;
      return callback(err);
    }
    topicArn = arn;
    done();
  });

  function done() {
    if (!topicArn || !queueUrl) return;
    sns.subscribe({
      TopicArn: topicArn,
      Protocol: 'sqs',
      Endpoint: queueUrl
    }, (err, result) => {
      if (err) return callback(err);
      callback(undefined, result.SubscriptionArn);
    });
  }
};

// TODO make gettopic arn more robust so it can have multiple calls to it wiht the same name before the first response
exports.publish = (topic, body, callback) => {
  getTopicArn(topic, (err, arn) => {
    if (err) return callback(err);
    sns.publish({
      Message: JSON.stringify(body),
      TopicArn: arn
    }, (err, result) => callback(err, result));
  });
};

function getTopicArn(name, callback) {
  sns.createTopic({ Name: name }, (err, data) => {
    if (err) callback(err);
    else callback(undefined, data.TopicArn);
  });
}
