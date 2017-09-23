/**
 * @module sns
 * @memberof sns-sqs-simple
 */

const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const {
  getQueueUrl,
  getQueues
} = require('./sqs');



/**
 * subscribe A topic to a queue of the same name
 * @export sns/subscribe
 * @param {string} topic - channel topic
 * @param {string} queue - options queue name
 * @param {subscribeCallback} callback
 */
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

/**
 * publish a message
 * @export sns/publish
 * @param {string} topic - channel topic
 * @param {Object} body - message object
 * @param {publishCallback} callback
 */
exports.publish = (topic, body, callback) => {
  getTopicArn(topic, (err, arn) => {
    if (err) return callback(err);
    sns.publish({
      Message: JSON.stringify(body),
      TopicArn: arn
    }, (err, response) => callback(err, response.MessageId));
  });
};

let gettingTopic = {};
function getTopicArn(name, callback) {
  if (gettingTopic[name]) return gettingTopic[name].push(callback);
  else gettingTopic[name] = gettingTopic[name] || [];

  sns.createTopic({ Name: name }, (err, data) => {
    if (gettingTopic[name]) {
      gettingTopic[name].forEach(cb => cb(err, (data || {}).TopicArn));
      delete gettingTopic[name];
    }
    callback(err, (data || {}).TopicArn);
  });
}



/**
* @callback subscribeCallback
* @param {Error} error - subscription errored
* @param {String} SubscriptionArn - arn for topic subscription
*/
/**
 * @callback publishCallback
 * @param {Error} error - subscription errored
 * @param {object} response - message info
 * @param {object} response.MessageId - un ique id for message
 */
