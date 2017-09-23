/**
 * @module sqs
 * @memberof sns-sqs-simple
 */

const AWS = require('aws-sdk');
const sqs = new AWS.SQS();
const queus = [];



/**
 * receive
 * @export sqs/receive
 * @param {string} topic - channel topic
 * @param {object} options - optinal options
 * @param {int} [options.repollTime=2000] - millaseconds for when to poll for messages after none have been recieved
 * @param {int} [options.VisibilityTimeout=60] -
 * @param {int} [options.WaitTimeSeconds=60] -
 * @param {int} [options.MaxNumberOfMessages=1] - capped at 10
 * @param {pollCallback} callback - callback on message being recieved
 * @return {function} call this function to stop polling
 */
function receive(nameOrUrl, options = {}, callback) {
  let kill = false;

  getQueueUrl(nameOrUrl, (err, queueUrl) => {
    if (err) return callback(err);
    if (!queueUrl) return callback(Error('could not find queue'));

    let repollTime = options.repollTime || 2000;
    let autoDelete = options.autoDelete || false;
    delete options.repollTime;
    delete options.autoDelete;

    options.QueueUrl = queueUrl;
    options.VisibilityTimeout = options.VisibilityTimeout || 60;
    options.WaitTimeSeconds = options.WaitTimeSeconds || 60;
    options.MaxNumberOfMessages = options.MaxNumberOfMessages || 1;
    if (options.MaxNumberOfMessages > 10) {
      console.log('max is capped at 10');
      options.MaxNumberOfMessages = 10;
    }

    sqs.receiveMessage(options, (err, data) => {
      if (err) return callback(err, undefined, noop);
      let messages = (data.Messages || []);
      let doneMessages = 0;
      messages.forEach(message => {
        let isDone = false;
        let body = JSON.parse(message.Body);
        try {
          body.Message = JSON.parse(body.Message);
        } catch(e) {}
        callback(undefined, body.Message, done);
        if (options.autoDelete) done();
        // delete the message
        // once all messages have been deleted then run queu again
        function done(doneCallback) {
          if (isDone) return;
          isDone = true;
          doneCallback = typeof doneCallback === 'function' ? doneCallback : noop;
          sqs.deleteMessage({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle
          }, (err) => {
            doneMessages++;
            if (doneMessages === messages.length) rePoll(true);
            if (err) isDone = false;
            doneCallback(err)
          });
        }
      });

      if (!messages.length) rePoll();
    });

    function rePoll(immediatly) {
      let time = immediatly ? 0 : options.repollTimel
      if (kill) return;
      setTimeout(() => {
        receive(nameOrUrl, options, callback)
      }, time)
    }
  });

  return () => {
    kill = true;
  };
}
exports.receive = receive;


/**
 * getQueueUrl
 * @export sqs/getQueueUrl
 * @param {string} name - queue name
 * @param {getQueueUrllCallback} callback - callback on message being recieved
 */
function getQueueUrl(name, callback) {
  let queue = getQueueFromMemory(name);
  if (queue && queue.url) return callback(undefined, queue.url);

  sqs.getQueueUrl({ QueueName: name }, (err, data) => {
    if (err || !data.QueueUrl) return createQueue(name, callback);
    addToQueue({ url: data.QueueUrl, name: name });
    callback(undefined, data.QueueUrl);
  });
}
exports.getQueueUrl = getQueueUrl;


/**
 * getQueueArn
 * @export sqs/getQueueArn
 * @param {string} name - arn name
 * @param {getQueueArnCallback} callback - callback on message being recieved
 */
function getQueueArn(name, callback) {
  let queue = getQueueFromMemory(name);
  if (queue && queue.arn) return callback(undefined, queue.arn);

  getQueueUrl(name, (err, queueUrl) => {
    if (err) return callback(err);
    if (!queueUrl) return callback(Error('could not find queue'));

    sqs.getQueueAttributes({
      QueueUrl: queueUrl,
      AttributeNames: ['QueueArn']
    }, (err, data) => {
      if (err) return callback(err);
      addToQueue({ url: queueUrl, name: name, arn: data.Attributes.QueueArn });
      callback(undefined, data.Attributes.QueueArn);
    });
  });
}
exports.getQueueArn = getQueueArn;


/**
 * getQueues
 * @export sqs/getQueues
 * @param {string} prefix - prefix of queue names
 * @param {getQueuesCallback} callback - callback on message being recieved
 */
function getQueues(prefix, callback) {
  let params = {};
  if (prefix) params.QueueNamePrefix = prefix;
  sqs.listQueues(params, (err, data) => {
    if (err) return callback(err);
    data.QueueUrls.forEach(url => {
      let name = url.split('/').pop();
      addToQueue({ url: url, name: name });
    });
    callback(undefined, data.QueueUrls);
  });
};
exports.getQueues = getQueues;



/**
 * createQueue
 * @export sqs/createQueue
 * @param {string} name - queue name
 * @param {createQueueCallback} callback - callback on message being recieved
 */
function createQueue(name, callback) {
  sqs.createQueue({ QueueName: name }, (err, data) => {
    if (err) return callback(err);
    addToQueue({ url: data.QueueUrl, name: name });
    setPermissions(data.QueueUrl);
    callback(undefined, data.QueueUrl);
  });
}
exports.createQueue = createQueue;


function getQueueFromMemory(any) {
  let queue = queus.filter(q => q.name === any || q.url === any || q.arn === any);
  return queue.length ? queue[0] : undefined;
}

function addToQueue(params) {
  queus.forEach(q => {
    if (
      (params.name && params.name === q.name)
      || (params.url && params.url === q.url)
      || (params.arn && params.arn === q.arn)
    ) {
      if (params.name === undefined) q.name = params.name;
      if (params.url === undefined) q.url = params.url;
      if (params.arn === undefined) q.arn = params.arn;
    }
  });
}

function setPermissions(url) {
  getQueueArn(url, (err, arn) => {
    let policy = {
      Id: "SQS+"+arn,
      Statement: {
        Sid: "1",
        Effect: "Allow",
        Principal: "*",
        Action: "sqs:*",
        Resource: arn
      }
    };

    sqs.setQueueAttributes({
      QueueUrl: url,
      Attributes: { Policy: JSON.stringify(policy) }
    });
  });
}

function noop() {}


/**
* @callback pollCallback
* @param {Error} error - subscription errored
* @param {Object} message - message object
*/
/**
 * @callback getQueueUrllCallback
 * @param {Error} error - subscription errored
 * @param {string} QueueUrl
 */
/**
* @callback getQueueArnCallback
* @param {Error} error - subscription errored
* @param {string} QueueArn
*/
/**
 * @callback getQueuesCallback
 * @param {Error} error - subscription errored
 * @param {array} QueueUrls
 */
/**
 * @callback createQueueCallback
 * @param {Error} error - subscription errored
 * @param {array} QueueUrl
 */
