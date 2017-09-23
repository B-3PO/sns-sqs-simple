const AWS = require('aws-sdk');
const sqs = new AWS.SQS();
const queus = [];

exports.receive = receive;
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

      (data.Messages || []).forEach(message => {
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
            if (err) isDone = false;
            doneCallback(err)
          });
        }
      });

      if (kill) return;
      setTimeout(() => {
        receive(nameOrUrl, options, callback)
      }, options.repollTime)
    });
  });

  return () => {
    kill = true;
  };
}

exports.getQueueUrl = getQueueUrl;
function getQueueUrl(name, callback) {
  let queue = getQueueFromMemory(name);
  if (queue && queue.url) return callback(undefined, queue.url);

  sqs.getQueueUrl({ QueueName: name }, (err, data) => {
    if (err || !data.QueueUrl) return createQueue(name, callback);
    addToQueue({ url: data.QueueUrl, name: name });
    callback(undefined, data.QueueUrl);
  });
}

exports.getQueueArn = getQueueArn;
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

exports.getQueues = getQueues;
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

exports.createQueue = createQueue;
function createQueue(name, callback) {
  sqs.createQueue({ QueueName: name }, (err, data) => {
    if (err) return callback(err);
    addToQueue({ url: data.QueueUrl, name: name });
    setPermissions(data.QueueUrl);
    callback(undefined, data.QueueUrl);
  });
}


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
