const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const { promisify } = require('util');

const { 
  masterNodeKey,
  sidecarKey,
  explorerKey,
  lastStacksChainTipHeightKey,
  lastStacksChainTipHeightTimeKey,
  lastChainResetKey,
  reseedingStepKey,
  ReseedingSteps,
} = require('./constants')

const cron = require('node-cron');
const moment = require('moment');
app.locals.moment = moment;
app.locals.formatTimestamp = (timestamp) => 
  moment.unix(timestamp).format('YYYY/MM/DD, HH:mm:ss')
app.locals.fromNow = (timestamp) => 
  moment.unix(timestamp).fromNow();

const redis = require("redis");
const client = redis.createClient();

const redisGetAsync = promisify(client.get).bind(client);

client.on("error", function(error) {
  console.error(error);
});

const status = require('./status');
status(client);
cron.schedule("*/5 * * * *", () => {
  status(client);
});

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.get('/', (req, res) => {

  const masterNodePromise = redisGetAsync(masterNodeKey).then((value) => {
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  });

  const sidecarPromise = redisGetAsync(sidecarKey).then((value) => {
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  });

  const explorerPromise = redisGetAsync(explorerKey).then((value) => {
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  });

  const lastStacksChainTipHeightPromise = redisGetAsync(lastStacksChainTipHeightKey);
  const lastStacksChainTipHeightTimePromise = redisGetAsync(lastStacksChainTipHeightTimeKey);
  const lastChainReset = redisGetAsync(lastChainResetKey);

  const promises = [
    masterNodePromise,
    sidecarPromise,
    explorerPromise,
    lastStacksChainTipHeightPromise,
    lastStacksChainTipHeightTimePromise,
    lastChainReset,
  ];

  return Promise.all(promises)
    .then(([
      masterNodePings,
      sidecarPings,
      explorerPings,
      lastStacksChainTipHeight,
      lastStacksChainTipHeightTime,
      lastChainReset,
    ]) => {
      const minutesSinceLastStacksBlock = moment.duration(moment().diff(moment.unix(lastStacksChainTipHeightTime))).asMinutes();
      const blockProgressStatus = minutesSinceLastStacksBlock > 30 ? 2 : minutesSinceLastStacksBlock > 10 ? 1 : 0

      const data = {
        masterNodePings,
        sidecarPings,
        explorerPings,
        lastStacksChainTipHeight,
        lastStacksChainTipHeightTime,
        blockProgressStatus,
        lastChainReset,
      };
      res.render('index', { data });
    })
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
