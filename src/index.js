const dotenv = require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const { promisify } = require('util');

const { 
  masterNodeKey,
  sidecarKey,
  explorerKey,
  stacksChainTipKey,
  lastStacksChainTipHeightKey,
  lastStacksChainTipHeightTimeKey,
  lastChainResetKey,
  reseedingStepKey,
  ReseedingSteps,
  seededFaucetTxKey,
  seededTokenTransferTxKey,
  seededContractDeployTxKey,
  seededContractCallTxKey,
  seededFaucetTxStatusKey,
  seededTokenTransferTxStatusKey,
  seededContractDeployTxStatusKey,
  seededContractCallTxStatusKey,
  seededFaucetTxBroadcastTimeKey,
  seededTokenTransferTxBroadcastTimeKey,
  seededContractDeployTxBroadcastTimeKey,
  seededContractCallTxBroadcastTimeKey,
  explorerURL,
  reseedAbortErrorKey,
  blockRateRedCount,
  blockRateYellowCount,
} = require('./constants')

const moment = require('moment');
app.locals.moment = moment;
app.locals.formatTimestamp = (timestamp) => 
  moment.unix(timestamp).format('YYYY/MM/DD, HH:mm:ss Z')
app.locals.fromNow = (timestamp) => 
  moment.unix(timestamp).fromNow();
app.locals.getExplorerTxURL = (txid) => 
  `${explorerURL}/txid/0x${txid}`;

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || '6379';

const redis = require("redis");
const client = redis.createClient({host: redisHost, port: redisPort});

const redisGetAsync = promisify(client.get).bind(client);

client.on("error", function(error) {
  console.error(error);
});

const cron = require('node-cron');

const statusSchedule = process.env.STATUS_SCHEDULE || '*/5 * * * *';
const reseedSchedule = process.env.RESEED_SCHEDULE || '*/59 * * * *';
const reseedRunSchedule = process.env.RESEED_RUN_SCHEDULE || '*/1 * * * *';


const status = require('./status');
status(client);
cron.schedule(statusSchedule, () => {
  status(client);
});

cron.schedule(reseedSchedule, () => {
  client.set(reseedingStepKey, ReseedingSteps.Setup.toString());
});

const reseed = require('./reseed');
cron.schedule(reseedRunSchedule, () => {
  reseed(client);
});

const checkSeededTransactions = async () => {
  const tokenTransferTx = await redisGetAsync(seededTokenTransferTxKey);
  return tokenTransferTx ? true : false;
}

const checkReseed = async () => {
  const seededTransactions = await checkSeededTransactions();
  if (!seededTransactions) {
    redisGetAsync(reseedingStepKey).then((reseedingStep) => {
      if (!reseedingStep || reseedingStep == ReseedingSteps.NotReseeding) {
        client.set(reseedingStepKey, ReseedingSteps.Setup.toString());
      }
    });
  }
}

checkReseed();

const getIndexData = () => {
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

  const stacksChainTipPromise = redisGetAsync(stacksChainTipKey).then((value) => {
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  });

  const lastStacksChainTipHeightPromise = redisGetAsync(lastStacksChainTipHeightKey);
  const lastStacksChainTipHeightTimePromise = redisGetAsync(lastStacksChainTipHeightTimeKey);
  const lastChainReset = redisGetAsync(lastChainResetKey);
  const seededFaucetTxidPromise = redisGetAsync(seededFaucetTxKey);
  const seededTokenTransferTxidPromise = redisGetAsync(seededTokenTransferTxKey);
  const seededContractDeployTxidPromise = redisGetAsync(seededContractDeployTxKey);
  const seededContractCallTxidPromise = redisGetAsync(seededContractCallTxKey);
  const seededFaucetTimePromise = redisGetAsync(seededFaucetTxBroadcastTimeKey);
  const seededTokenTransferTimePromise = redisGetAsync(seededTokenTransferTxBroadcastTimeKey);
  const seededContractDeployTimePromise = redisGetAsync(seededContractDeployTxBroadcastTimeKey);
  const seededContractCallTimePromise = redisGetAsync(seededContractCallTxBroadcastTimeKey);
  const seededFaucetTxStatusPromise = redisGetAsync(seededFaucetTxStatusKey);
  const seededTokenTransferTxStatusPromise = redisGetAsync(seededTokenTransferTxStatusKey);
  const seededContractDeployTxStatusPromise = redisGetAsync(seededContractDeployTxStatusKey);
  const seededContractCallTxStatusPromise = redisGetAsync(seededContractCallTxStatusKey);

  const reseedAbortErrorPromise = redisGetAsync(reseedAbortErrorKey);
  const reseedingStepPromise = redisGetAsync(reseedingStepKey)


  const promises = [
    masterNodePromise,
    sidecarPromise,
    explorerPromise,
    stacksChainTipPromise,
    lastStacksChainTipHeightPromise,
    lastStacksChainTipHeightTimePromise,
    lastChainReset,
    seededFaucetTxidPromise,
    seededTokenTransferTxidPromise,
    seededContractDeployTxidPromise,
    seededContractCallTxidPromise,
    seededFaucetTimePromise,
    seededTokenTransferTimePromise,
    seededContractDeployTimePromise,
    seededContractCallTimePromise,
    seededFaucetTxStatusPromise,
    seededTokenTransferTxStatusPromise,
    seededContractDeployTxStatusPromise,
    seededContractCallTxStatusPromise,
    reseedAbortErrorPromise,
    reseedingStepPromise,
  ];

  return Promise.all(promises)
    .then(([
      masterNodePings,
      sidecarPings,
      explorerPings,
      stacksChainTipHistorical,
      lastStacksChainTipHeight,
      lastStacksChainTipHeightTime,
      lastChainReset,
      seededFaucetTxid,
      seededTokenTransferTxid,
      seededContractDeployTxid,
      seededContractCallTxid,
      seededFaucetTxTime,
      seededTokenTransferTime,
      seededContractDeployTime,
      seededContractCallTime,
      seededFaucetTxStatus,
      seededTokenTransferTxStatus,
      seededContractDeployTxStatus,
      seededContractCallTxStatus,
      reseedAbortError,
      reseedingStep,
    ]) => {
      const minutesSinceLastStacksBlock = moment.duration(moment().diff(moment.unix(lastStacksChainTipHeightTime))).asMinutes();
      const blockProgressStatus = minutesSinceLastStacksBlock > 30 ? 2 : minutesSinceLastStacksBlock > 10 ? 1 : 0
      var averageBlockRate = 0;
      var showLastHourAverage = false;
      var lastHourAverageBlockRate = 0;
      var blockRateDuration = 0; 
      const blockRateUnits = 'blocks/hr';
      var blockRateStatus = 0;
      var lastHourBlockRateStatus = 0;

      if (stacksChainTipHistorical && stacksChainTipHistorical.length > 1) {
        const latestBlockTimestamp = stacksChainTipHistorical[0].timestamp;
        const latestBlockHeight = stacksChainTipHistorical[0].value;
        const oldestBlockTimestamp = stacksChainTipHistorical[stacksChainTipHistorical.length - 1].timestamp;
        const oldestBlockHeight = stacksChainTipHistorical[stacksChainTipHistorical.length - 1].value;
        const duration = moment.duration(moment.unix(latestBlockTimestamp).diff(moment.unix(oldestBlockTimestamp)));
        const heightDifference = latestBlockHeight - oldestBlockHeight;

        if (heightDifference > 0 && duration > 0) {
          averageBlockRate = heightDifference / duration.asHours();
          blockRateDuration = duration.asHours();
          if (averageBlockRate < blockRateRedCount) {
            blockRateStatus = 2;
          } else if (averageBlockRate < blockRateYellowCount) {
            blockRateStatus = 1;
          }

          // extra hacky 1 hour block rate based on default node-cron schedule (6 data points)
          if (stacksChainTipHistorical.length > 6) {
            showLastHourAverage = true;
            const approxOneHourAgoBlockHeight = stacksChainTipHistorical[5].value;
            const approxOneHourAgoTimestamp = stacksChainTipHistorical[5].timestamp;
            const approxOneHourHeightDifference = latestBlockHeight - approxOneHourAgoBlockHeight;
            const approxOneHourDuration = moment.duration(moment.unix(latestBlockTimestamp).diff(moment.unix(approxOneHourAgoTimestamp)));
            lastHourAverageBlockRate = approxOneHourHeightDifference / approxOneHourDuration.asHours();
            if (lastHourAverageBlockRate < blockRateRedCount) {
              lastHourBlockRateStatus = 2;
            } else if (averageBlockRate < blockRateYellowCount) {
              lastHourBlockRateStatus = 1;
            }
          }
        }
      }

      return {
        masterNodePings,
        sidecarPings,
        explorerPings,
        stacksChainTipHistorical,
        averageBlockRate,
        blockRateDuration,
        blockRateUnits,
        blockRateStatus,
        showLastHourAverage,
        lastHourAverageBlockRate,
        lastHourBlockRateStatus,
        lastStacksChainTipHeight,
        lastStacksChainTipHeightTime,
        blockProgressStatus,
        lastChainReset,
        seededFaucetTx: {
          txid: seededFaucetTxid,
          broadcasted: seededFaucetTxTime,
          status: seededFaucetTxStatus,
        },
        seededTokenTransferTx: {
          txid: seededTokenTransferTxid,
          broadcasted: seededTokenTransferTime,
          status: seededTokenTransferTxStatus,
        },
        seededContractDeployTx: {
          txid: seededContractDeployTxid,
          broadcasted: seededContractDeployTime,
          status: seededContractDeployTxStatus,
        },
        seededContractCallTx: {
          txid: seededContractCallTxid,
          broadcasted: seededContractCallTime,
          status: seededContractCallTxStatus,
        },
        reseedAbortError,
        reseedingStep
      };
    })
}

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.get('/', (req, res) => {
  getIndexData().then(data => {
    return res.render('index', { data });
  })
});
app.get('/json', (req, res) => {
  getIndexData().then(data => {
    return res.send(data);
  })
});

app.listen(port, () => console.log(`listening at http://localhost:${port}`));
