const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const moment = require('moment');
const { promisify } = require('util');

const { 
  pingTimeout,
  nodeInfoURL,
  sidecarURL,
  sidecarTxURL,
  explorerURL,
  masterNodeKey,
  sidecarKey,
  explorerKey,
  stacksChainTipKey,
  lastStacksChainTipHeightKey,
  lastStacksChainTipHeightTimeKey,
  lastChainResetKey,
  exitAtBlockKey,
  ReseedingSteps,
  reseedingStepKey,
  seededFaucetTxKey,
  seededTokenTransferTxKey,
  seededContractDeployTxKey,
  seededContractCallTxKey,
  seededFaucetTxStatusKey,
  seededTokenTransferTxStatusKey,
  seededContractDeployTxStatusKey,
  seededContractCallTxStatusKey,
  historicalDataMax,
} = require('./constants')

function getAndUpdateStatus(url, redisKey, redisClient, data, json = false) {
  return getStatus(url, json)
    .then((response) => {
      if (!response) {
        updateHistorical(redisClient, redisKey, data, 0);
        return false;
      } else {
        updateHistorical(redisClient, redisKey, data, 1);
        return response
      }
    })
    .catch((error) => {
      updateHistorical(redisClient, redisKey, data, 0);
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
      if (json.property) {
        if (!data.hasOwnProperty(json.property)) {
          return Promise.reject('Required status check property not found in response');
        } else {
          if (json.value && data[json.property] != json.value) {
            return Promise.reject('Stacks check property value incorrect');
          }
        }
      }

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

function updateHistorical(redisClient, key, data, value) {
  const newPoint = { 
    timestamp: moment().unix(), 
    value
  };

  if(!data) {
    data = [];
  }
  data.unshift(newPoint);
  if (data.length > historicalDataMax) {
    data = data.slice(0, historicalDataMax);
  }
  redisClient.set(key, JSON.stringify(data));
}

module.exports = function status(redisClient) {
  const redisGetAsync = promisify(redisClient.get).bind(redisClient);

  const masterNodePromise = redisGetAsync(masterNodeKey).then((value) => {
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  }).then(data => {
    return getAndUpdateStatus(nodeInfoURL, masterNodeKey, redisClient, data, { property: "stacks_tip_height" });
  });

  const sidecarPromise = redisGetAsync(sidecarKey).then((value) => {
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  }).then(data => {
    return getAndUpdateStatus(sidecarURL, sidecarKey, redisClient, data, { property: "status", value: "ready" });
  });

  const explorerPromise = redisGetAsync(explorerKey).then((value) => {
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  }).then(data => {
    return getAndUpdateStatus(explorerURL, explorerKey, redisClient, data);
  });

  const faucetTxStatusPromise = redisGetAsync(seededFaucetTxKey).then((txid) => {
    if (!txid) return false;
    const url = `${sidecarTxURL}/0x${txid}`;
    return getStatus(url, { property: "tx_status" })
      .then((response) => {
        if (!response) {
          redisClient.set(seededFaucetTxStatusKey, "Not found");
          return false;
        } else {
          redisClient.set(seededFaucetTxStatusKey, response.tx_status);
          return response
        }
      })
      .catch((error) => {
        redisClient.set(seededFaucetTxStatusKey, "Not found");
        return false;
      });
  });

  const tokenTransferTxStatusPromise = redisGetAsync(seededTokenTransferTxKey).then((txid) => {
    if (!txid) return false;
    const url = `${sidecarTxURL}/0x${txid}`;
    return getStatus(url, { property: "tx_status" })
      .then((response) => {
        if (!response) {
          redisClient.set(seededTokenTransferTxStatusKey, "Not found");
          return false;
        } else {
          redisClient.set(seededTokenTransferTxStatusKey, response.tx_status);
          return response
        }
      })
      .catch((error) => {
        redisClient.set(seededTokenTransferTxStatusKey, "Not found");
        return false;
      });
  });

  const contractDeployTxStatusPromise = redisGetAsync(seededContractDeployTxKey).then((txid) => {
    if (!txid) return false;
    const url = `${sidecarTxURL}/0x${txid}`;
    return getStatus(url, { property: "tx_status" })
      .then((response) => {
        if (!response) {
          redisClient.set(seededContractDeployTxStatusKey, "Not found");
          return false;
        } else {
          redisClient.set(seededContractDeployTxStatusKey, response.tx_status);
          return response
        }
      })
      .catch((error) => {
        redisClient.set(seededContractDeployTxStatusKey, "Not found");
        return false;
      });
  });

  const contractCallTxStatusPromise = redisGetAsync(seededContractCallTxKey).then((txid) => {
    if (!txid) return false;
    const url = `${sidecarTxURL}/0x${txid}`;
    return getStatus(url, { property: "tx_status" })
      .then((response) => {
        if (!response) {
          redisClient.set(seededContractCallTxStatusKey, "Not found");
          return false;
        } else {
          redisClient.set(seededContractCallTxStatusKey, response.tx_status);
          return response
        }
      })
      .catch((error) => {
        redisClient.set(seededContractCallTxStatusKey, "Not found");
        return false;
      });
  });

  const lastStacksChainTipHeightPromise = redisGetAsync(lastStacksChainTipHeightKey);

  const promises = [
    masterNodePromise,
    sidecarPromise,
    explorerPromise,
    lastStacksChainTipHeightPromise,
    faucetTxStatusPromise,
    tokenTransferTxStatusPromise,
    contractDeployTxStatusPromise,
    contractCallTxStatusPromise,
  ];

  return Promise.all(promises)
    .then(([
      masterNodeResponse,
      sidecarResponse,
      explorerResponse,
      lastStacksChainTipHeight,
      faucetTxStatus,
      tokenTransferTxStatus,
      contractDeployTxStatus,
      contractCallTxStatus,
    ]) => {
      if (masterNodeResponse) {
        const newStacksChainTipHeight = masterNodeResponse.stacks_tip_height;
        const exitAtBlock = masterNodeResponse.exit_at_block_height;
        redisClient.set(exitAtBlockKey, exitAtBlock.toString());

        if (newStacksChainTipHeight < parseInt(lastStacksChainTipHeight)) {
          redisClient.set(reseedingStepKey, ReseedingSteps.Setup.toString());
          redisClient.set(lastStacksChainTipHeightKey, newStacksChainTipHeight);
          redisClient.set(lastStacksChainTipHeightTimeKey, moment().unix().toString());
          redisClient.set(lastChainResetKey, moment().unix().toString());
          redisClient.del(stacksChainTipKey);
        } else {
          redisClient.set(lastStacksChainTipHeightKey, newStacksChainTipHeight);
          redisClient.set(lastStacksChainTipHeightTimeKey, moment().unix().toString());
        }

        if (newStacksChainTipHeight >= parseInt(lastStacksChainTipHeight)) {
          redisGetAsync(stacksChainTipKey).then((value) => {
            if (value) {
              return JSON.parse(value);
            } else {
              return null;
            }
          }).then((data) => {
            return updateHistorical(redisClient, stacksChainTipKey, data, newStacksChainTipHeight);
          });
        }

      } else {
        redisGetAsync(stacksChainTipKey).then((value) => {
          if (value) {
            return JSON.parse(value);
          } else {
            return null;
          }
        }).then((data) => {
          return updateHistorical(redisClient, stacksChainTipKey, data, lastStacksChainTipHeight);
        });
      }

    });
  
}
