const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const moment = require('moment');
const { promisify } = require('util');

const historicalDataMax = 72;

const { 
  pingTimeout,
  nodeInfoURL,
  sidecarURL,
  explorerURL,
  masterNodeKey,
  sidecarKey,
  explorerKey,
  lastStacksChainTipHeightKey,
  lastStacksChainTipHeightTimeKey,
  lastBurnBlockHeightKey,
  lastBurnBlockHeightTimeKey,
  lastChainResetKey,
} = require('./constants')

function getAndUpdateStatus(url, redisKey, client, data, json = true) {
  return getStatus(url, json)
    .then((response) => {
      if (!response) {
        updateHistorical(client, redisKey, data, 0);
        return false;
      } else {
        updateHistorical(client, redisKey, data, 1);
        return response
      }
    })
    .catch((error) => {
      updateHistorical(client, redisKey, data, 0);
      return false;
    });
}

function getStatus(url, json) {
  const controller = new AbortController();
  const requestTimeout = setTimeout(
    () => { controller.abort(); },
    pingTimeout,
  );
  return fetch(url, { signal: controller.signal })
    .then(res => {
      return json ? res.json() : res.status;
    })
    .then((data) => {
      console.log(`ok ${url}`);
      return data;
    })
    .catch(err => {
      console.log(`error: ${url}`);
      console.log(err);
      if (err.name === 'AbortError') {
        console.log('request was aborted');
      }
      return false;
    })
    .finally(() => {
      clearTimeout(requestTimeout);
    });
}

function updateHistorical(client, key, data, status) {
  const pingResult = { timestamp: moment().unix(), status };
  if(!data) {
    data = [];
  }
  data.unshift(pingResult);
  if (data.length > historicalDataMax) {
    data = data.slice(0, historicalDataMax);
  }
  client.set(key, JSON.stringify(data));
}

module.exports = function status(client) {
  console.log("Running status check");
  const redisGetAsync = promisify(client.get).bind(client);

  const masterNodePromise = redisGetAsync(masterNodeKey).then((value) => {
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  }).then(data => {
    return getAndUpdateStatus(nodeInfoURL, masterNodeKey, client, data);
  });

  const sidecarPromise = redisGetAsync(sidecarKey).then((value) => {
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  }).then(data => {
    return getAndUpdateStatus(sidecarURL, sidecarKey, client, data);
  });

  const explorerPromise = redisGetAsync(explorerKey).then((value) => {
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  }).then(data => {
    return getAndUpdateStatus(explorerURL, explorerKey, client, data, false);
  });

  const lastStacksChainTipHeightPromise = redisGetAsync(lastStacksChainTipHeightKey);

  const promises = [
    masterNodePromise,
    sidecarPromise,
    explorerPromise,
    lastStacksChainTipHeightPromise,
  ];

  return Promise.all(promises)
    .then(([
      masterNodeResponse,
      sidecarResponse,
      explorerResponse,
      lastStacksChainTipHeight
    ]) => {

      if (masterNodeResponse) {
        // console.log(masterNodeResponse);
        const newStacksChainTipHeight = masterNodeResponse.stacks_tip_height;

        console.log(`Last chain tip: ${lastStacksChainTipHeight} new chain tip: ${newStacksChainTipHeight}`);
        if (newStacksChainTipHeight != lastStacksChainTipHeight) {
          console.log(`stacks tip height changed from ${lastStacksChainTipHeight} to ${newStacksChainTipHeight}`);

          if (newStacksChainTipHeight < lastStacksChainTipHeight) {
            console.log('possible chain reset detected');
            if (masterNodeResponse) {
              console.log('re-seeding transactions');
              try {
                // re-seed transactions
              } catch(error) {
                console.log(error);
              }
              client.set(lastStacksChainTipHeightKey, newStacksChainTipHeight);
              client.set(lastStacksChainTipHeightTimeKey, moment().unix().toString());
              client.set(lastChainResetKey, moment().unix().toString());
            }
          } else {
            client.set(lastStacksChainTipHeightKey, newStacksChainTipHeight);
            client.set(lastStacksChainTipHeightTimeKey, moment().unix().toString());
          }

        }
      }

    });
  
}
