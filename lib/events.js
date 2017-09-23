/**
* @module sns-sqs-simple
*/

const SNS = require('./sns');
const SQS = require('./sqs');
const messages = {};


/**
 * subscribe
 * @export sns-sqs-simple/subscribe
 * @param {string} topic - channel topic
 * @param {string=} queue - options queue name. If none is passes in it will use the topic name
 * @param {subscribeCallback} callback
 */
exports.subscribe = (topic, ...rest) => {
  let queueName = rest.length > 1 ? rest[0] : undefined;
  let callback = rest[rest.length-1];
  if (typeof callback !== 'function') throw Error('missing callback');
  SNS.subscribe(topic, queueName, callback);
};


/**
 * publish
 * @export sns-sqs-simple/publish
 * @param {string} topic - channel topic
 * @param {Object} body - message body
 */
exports.publish = (topic, body) => {
  if (typeof topic !== 'string' || topic === '') {
    console.error('Requires `topic` of type `String` as first paramater');
    return;
  }

  if (!messages[topic]) messages[topic] = [];
  SNS.publish(topic, body, (err, MessageId) => {
    messages[topic].push(MessageId); // used to track message. this will allow for sync style methods and tracking if we have any lingering messages that we expected to be answered
  });
};


/**
 * poll
 * @export sns-sqs-simple/poll
 * @param {string} topic - channel topic
 * @param {object=} options - optinal options
 * @param {int} [options.repollTime=2000] - millaseconds for when to poll for messages after none have been recieved
 * @param {int} [options.VisibilityTimeout=60] -
 * @param {int} [options.WaitTimeSeconds=60] -
 * @param {int} [options.MaxNumberOfMessages=1] - capped at 10
 * @param {pollCallback} callback - callback on message being recieved
 * @return {function} call this function to stop polling
 */
exports.poll = (topic, ...rest) => {
  let options = rest.length > 1 ? rest[0] : {};
  let callback = rest[rest.length-1];
  if (typeof callback !== 'function') throw Error('missing callback');
  return SQS.receive(topic, options, callback);
};




/**
 * @callback subscribeCallback
 * @param {Error} error - subscription errored
 * @param {String} SubscriptionArn - arn for topic subscription
 */
/**
 * @callback pollCallback
 * @param {Error} error - subscription errored
 * @param {Object} message - message object
 */
