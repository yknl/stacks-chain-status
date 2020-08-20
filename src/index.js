const dotenv = require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const { promisify } = require('util');

const { 
  masterNodeKey,
  sidecarKey,
  explorerKey,
  stacksChainTipKey,
  lastStacksChainTipHeightKey,
  lastStacksChainTipHeightTimeKey,
  lastBurnBlockHeightKey,
  lastBurnBlockHeightTimeKey,
  lastChainResetKey,
  reseedingStepKey,
  exitAtBlockKey,
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
  burnChainBlockRate,
} = require('./constants')

const moment = require('moment');
app.locals.moment = moment;
app.locals.formatTimestamp = (timestamp) => 
  moment.unix(timestamp).format('YYYY/MM/DD, HH:mm:ss Z')
app.locals.fromNow = (timestamp) => 
  moment.unix(timestamp).fromNow();
app.locals.getExplorerTxURL = (txid) => 
  `${explorerURL}/txid/0x${txid}`;

const redis = require("redis");
let clientConfig = {};

if (process.env.NODE_ENV === "production") {
  clientConfig = { url: process.env.REDIS_URL };
} else {
  clientConfig = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || "6379",
  };
}

const client = redis.createClient(clientConfig);

const redisGetAsync = promisify(client.get).bind(client);

client.on("error", function(error) {
  console.error(error);
});

const cron = require('node-cron');

const statusSchedule = process.env.STATUS_SCHEDULE || '*/5 * * * *';
const reseedSchedule = process.env.RESEED_SCHEDULE || '*/59 * * * *';
const reseedRunSchedule = process.env.RESEED_RUN_SCHEDULE || '*/4 * * * *';


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
  const lastBurnBlockHeightPromise = redisGetAsync(lastBurnBlockHeightKey);
  const lastBurnBlockHeightTimePromise = redisGetAsync(lastBurnBlockHeightTimeKey);
  const lastChainResetPromise = redisGetAsync(lastChainResetKey);
  const exitAtBlockPromise = redisGetAsync(exitAtBlockKey);
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
    lastBurnBlockHeightPromise,
    lastChainResetPromise,
    exitAtBlockPromise,
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
      lastBurnBlockHeight,
      lastChainReset,
      exitAtBlock,
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
      var calculatingBlockRate = false;
      var showLastHourAverage = false;
      var lastHourAverageBlockRate = 0;
      var blockRateDuration = 0; 
      const blockRateUnits = 'blocks/hr';
      var blockRateStatus = 2;
      var lastHourBlockRateStatus = 2;
      var estimatedTimeUntilReset = false;

      if (stacksChainTipHistorical && stacksChainTipHistorical.length > 1) {
        const latestBlockTimestamp = stacksChainTipHistorical[0].timestamp;
        const latestBlockHeight = stacksChainTipHistorical[0].value;
        const oldestBlockTimestamp = stacksChainTipHistorical[stacksChainTipHistorical.length - 1].timestamp;
        const oldestBlockHeight = stacksChainTipHistorical[stacksChainTipHistorical.length - 1].value;
        const duration = moment.duration(moment.unix(latestBlockTimestamp).diff(moment.unix(oldestBlockTimestamp)));
        const heightDifference = latestBlockHeight - oldestBlockHeight;
        blockRateDuration = duration.asHours();

        if (heightDifference > 0 && blockRateDuration > 0) {
          averageBlockRate = heightDifference / blockRateDuration;
          if (averageBlockRate < blockRateRedCount) {
            blockRateStatus = 2;
          } else if (averageBlockRate < blockRateYellowCount) {
            blockRateStatus = 1;
          } else {
            blockRateStatus = 0;
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
            } else {
              lastHourBlockRateStatus = 0;
            }
          } 
        } else if (stacksChainTipHistorical.length === 0) {
          calculatingBlockRate = true;
        }
      }
      
      if (averageBlockRate > 0) {
        const blocksUntilReset = exitAtBlock - lastBurnBlockHeight;
        const estimatedHoursUntilReset = blocksUntilReset / burnChainBlockRate;
        const estimatedResetDuration = moment.duration({hours: estimatedHoursUntilReset});
        if (estimatedResetDuration.asDays() > 0) {
          estimatedTimeUntilReset = `${estimatedResetDuration.days()}d ${estimatedResetDuration.hours()}h ${estimatedResetDuration.minutes()}m`;
        } else if (estimatedResetDuration.asHours > 0) {
          estimatedTimeUntilReset = `${estimatedResetDuration.hours()}h ${estimatedResetDuration.minutes()}m`;
        } else {
          estimatedTimeUntilReset = `${estimatedResetDuration.minutes()}m`;
        }
      }

      return {
        masterNodePings,
        sidecarPings,
        explorerPings,
        stacksChainTipHistorical,
        calculatingBlockRate,
        averageBlockRate,
        blockRateDuration,
        blockRateUnits,
        blockRateStatus,
        showLastHourAverage,
        lastHourAverageBlockRate,
        lastHourBlockRateStatus,
        lastStacksChainTipHeight,
        lastStacksChainTipHeightTime,
        lastBurnBlockHeight,
        blockProgressStatus,
        lastChainReset,
        exitAtBlock,
        estimatedTimeUntilReset,
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

// enable cors
app.use(cors());

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.get('/', (req, res) => {
  getIndexData().then(data => {
    return res.render('index', { data });
  })
});
app.get('/json', (req, res) => {
  getIndexData().then(data => {
    return res.json(data);
  })
});

app.listen(port, () => console.log(`listening at http://localhost:${port}`));
