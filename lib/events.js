const SNS = require('./sns');
const SQS = require('./sqs');
const messages = {};


exports.subscribe = (topic, callback) => {
  SNS.subscribe(topic, undefined, callback);
};

exports.publish = (topic, data) => {
  if (typeof topic !== 'string' || topic === '') {
    console.error('Requires `topic` of type `String` as first paramater');
    return;
  }

  if (!messages[topic]) messages[topic] = [];
  SNS.publish(topic, data, (err, MessageId) => {
    messages[topic].push(MessageId); // used to track message. this will allow for sync style methods and tracking if we have any lingering messages that we expected to be answered
  });
};

exports.poll = (topic, callback) => {
  SQS.receive(topic, {}, callback);
};
