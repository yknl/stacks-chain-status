const { 
  makeSTXTokenTransfer,
  makeSmartContractDeploy,
  makeContractCall,
  PostConditionMode,
  StacksTestnet,
  broadcastTransaction,
  bufferCVFromString,
  makeRandomPrivKey,
  getAddressFromPrivateKey,
  TransactionVersion,
} = require('@blockstack/stacks-transactions');

const { promisify } = require('util');
const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const BN = require('bn.js');
const fs = require('fs');
const moment = require('moment');

const { 
  pingTimeout,
  faucetURL,
  reseedingStepKey,
  reseedNextBlockKey,
  reseedTryCountKey,
  reseedMaxTryCount,
  ReseedingSteps,
  seededFaucetTxKey,
  seededTokenTransferTxKey,
  seededContractDeployTxKey,
  seededContractCallTxKey,
  seededFaucetTxBroadcastTimeKey,
  seededTokenTransferTxBroadcastTimeKey,
  seededContractDeployTxBroadcastTimeKey,
  seededContractCallTxBroadcastTimeKey,
  seededFaucetTxStatusKey,
  seededTokenTransferTxStatusKey,
  seededContractDeployTxStatusKey,
  seededContractCallTxStatusKey,
  lastStacksChainTipHeightKey,
  reseedStepMinBlocks,
  reseedAbortErrorKey,
  reseedRandomKey,
  reseedRandomAddress,
} = require('./constants')

const resetTryCount = (redisClient) => {
  redisClient.del(reseedTryCountKey);
}

const incrementTryCount = (redisClient) => {
  redisClient.incr(reseedTryCountKey);
}

const getTryCount = async (redisClient) => {
  const redisGetAsync = promisify(redisClient.get).bind(redisClient);
  const tryCount = await redisGetAsync(reseedTryCountKey);
  return parseInt(tryCount);
}

const getCurrentBlock = async (redisClient) => {
  const redisGetAsync = promisify(redisClient.get).bind(redisClient);
  const currentBlock = await redisGetAsync(lastStacksChainTipHeightKey);
  return parseInt(currentBlock);
}

const getNextStepBlock = async (redisClient) => {
  const redisGetAsync = promisify(redisClient.get).bind(redisClient);
  const nextStepBlock = await redisGetAsync(reseedNextBlockKey);
  return parseInt(nextStepBlock);
}

const setNextStepBlock = async (redisClient, blocks) => {
  const currentBlock = await getCurrentBlock(redisClient);
  const nextStepBlock = currentBlock + blocks;
  redisClient.set(reseedNextBlockKey, nextStepBlock.toString());
}

const resetNextStepBlock = (redisClient) => {
  redisClient.del(reseedNextBlockKey);
}

const setNextStep = (redisClient, step) => {
  redisClient.set(reseedingStepKey, step.toString());
}

const checkNextStepBlock = async (redisClient) => {
  const currentBlock = await getCurrentBlock(redisClient);
  const nextStepBlock = await getNextStepBlock(redisClient);
  return currentBlock >= nextStepBlock;
}

const checkRetry = async (redisClient, error) => {
  const tryCount = await getTryCount(redisClient);
  if (tryCount >= reseedMaxTryCount) {
    abort(redisClient, error);
  } else {
    incrementTryCount(redisClient);
  }
}

const abort = (redisClient, error) => {
  redisClient.set(reseedAbortErrorKey, error);
  setNextStep(redisClient, ReseedingSteps.NotReseeding);
  resetTryCount(redisClient);
}

const generateRandomKey = () => {
  const privateKey = makeRandomPrivKey();
  const address = getAddressFromPrivateKey(privateKey.data, TransactionVersion.Testnet);
  return { privateKey, address };
}

const saveKey = (redisClient, privateKey, address) => {
  redisClient.set(reseedRandomKey, privateKey.data.toString('hex'));
  redisClient.set(reseedRandomAddress, address);
}

const getKey = async (redisClient) => {
  const redisGetAsync = promisify(redisClient.get).bind(redisClient);
  const privateKey = await redisGetAsync(reseedRandomKey);
  const address = await redisGetAsync(reseedRandomAddress);
  return { privateKey, address };
}

const setup = async (redisClient) => {
  redisClient.del(reseedAbortErrorKey);
  redisClient.del(seededFaucetTxKey);
  redisClient.del(seededTokenTransferTxKey);
  redisClient.del(seededContractDeployTxKey);
  redisClient.del(seededContractCallTxKey);
  redisClient.del(seededFaucetTxBroadcastTimeKey);
  redisClient.del(seededTokenTransferTxBroadcastTimeKey);
  redisClient.del(seededContractDeployTxBroadcastTimeKey);
  redisClient.del(seededContractCallTxBroadcastTimeKey);
  redisClient.del(seededFaucetTxStatusKey);
  redisClient.del(seededTokenTransferTxStatusKey);
  redisClient.del(seededContractDeployTxStatusKey);
  redisClient.del(seededContractCallTxStatusKey);

  const randomKey = generateRandomKey();
  const address = randomKey.address;
  saveKey(redisClient, randomKey.privateKey, randomKey.address);

  const controller = new AbortController();
  const requestTimeout = setTimeout(
    () => { controller.abort(); },
    pingTimeout,
  );

  const url = `${faucetURL}${address}`;
  fetch(url, { method: 'POST', signal: controller.signal })
    .then(res => res.json())
    .then((data) => {
      if (data.success == true) {
        redisClient.set(seededFaucetTxKey, data.txId.substr(2));
        redisClient.set(seededFaucetTxBroadcastTimeKey, moment().unix().toString());
      } else {
        return Promise.reject(`Faucet call failed`);
      }
      setNextStepBlock(redisClient, reseedStepMinBlocks);
      setNextStep(redisClient, ReseedingSteps.TokenTransfer);
    })
    .catch(err => {
      console.log(err);
      if (err.name === 'AbortError') {
        console.log('request was aborted');
      }
      checkRetry(redisClient, `Faucet error: ${err.toString()}`);
    })
    .finally(() => {
      clearTimeout(requestTimeout);
    });
}

const createTokenTransfer = async (redisClient) => {
  const shouldBegin = await checkNextStepBlock(redisClient);

  if (shouldBegin) {
    const controller = new AbortController();
    const requestTimeout = setTimeout(
      () => { controller.abort(); },
      pingTimeout,
    );
  
    const savedKey = await getKey(redisClient);
    const privateKey = savedKey.privateKey.toString('hex');
      
    const network = new StacksTestnet();
    const url = network.getAccountApiUrl(savedKey.address);
  
    fetch(url, { signal: controller.signal })
    .then(res => res.json())
    .then((data) => {
      let balanceHex = data.balance;
      if(balanceHex.startsWith('0x')) {
        balanceHex = balanceHex.substr(2);
      } 

      const balance = new BN(balanceHex, 16);
      if (balance.gt(new BN(0))) {
        return doTokenTransfer(privateKey);
      } else {
        return Promise.reject(`Insufficient balance for token transfer: ${balance.toString(10)}`);
      }
    })
    .then((txid) => {
      redisClient.set(seededTokenTransferTxKey, txid);
      redisClient.set(seededTokenTransferTxBroadcastTimeKey, moment().unix().toString());
      setNextStepBlock(redisClient, reseedStepMinBlocks);
      setNextStep(redisClient, ReseedingSteps.ContractDeploy);
    })
    .catch(err => {
      console.log(err);
      checkRetry(redisClient, `Token transfer tx error: ${err.toString()}`);
    })
    .finally(() => {
      clearTimeout(requestTimeout);
    });
  }
}

const doTokenTransfer = async (privateKey) => {
  const network = new StacksTestnet();
  const randomRecipient = generateRandomKey();
  const recipientAddress = randomRecipient.address;
  const txOptions = {
    recipient: recipientAddress,
    amount: new BN(10000),
    senderKey: privateKey,
    network,
  };
  const transaction = await makeSTXTokenTransfer(txOptions);
  return broadcastTransaction(transaction, network).then(() => {
    return transaction.txid();
  })
}

const createContractDeploy = async (redisClient) => {
  const shouldBegin = await checkNextStepBlock(redisClient);

  if (shouldBegin) {
    const savedKey = await getKey(redisClient);
    const privateKey = savedKey.privateKey.toString('hex');

    doContractDeploy(privateKey).then((txid) => {
      redisClient.set(seededContractDeployTxKey, txid);
      redisClient.set(seededContractDeployTxBroadcastTimeKey, moment().unix().toString());
      setNextStepBlock(redisClient, reseedStepMinBlocks);
      setNextStep(redisClient, ReseedingSteps.ContractCall);
    }).catch(err => {
      console.log(err);
      checkRetry(redisClient, `Contract deploy tx error: ${err.toString()}`);
    })
  }
}

const doContractDeploy = async (privateKey) => {
  const network = new StacksTestnet();
  const txOptions = {
    contractName: 'hello_world',
    codeBody: fs.readFileSync('./src/contracts/helloworld.clar').toString(),
    senderKey: privateKey,
    fee: new BN(3000),
    network,
    postConditionMode: PostConditionMode.Allow
  };

  const transaction = await makeSmartContractDeploy(txOptions);
  return broadcastTransaction(transaction, network).then(() => {
    return transaction.txid();
  })
}

const createContractCall = async (redisClient) => {
  const shouldBegin = await checkNextStepBlock(redisClient);

  if (shouldBegin) {
    const savedKey = await getKey(redisClient);
    const privateKey = savedKey.privateKey.toString('hex');
    const address = savedKey.address;

    doContractCall(privateKey, address).then((txid) => {
      redisClient.set(seededContractCallTxKey, txid);
      redisClient.set(seededContractCallTxBroadcastTimeKey, moment().unix().toString());
      resetNextStepBlock(redisClient);
      setNextStep(redisClient, ReseedingSteps.NotReseeding);
    }).catch(err => {
      console.log(err);
      checkRetry(redisClient, `Contract call tx error: ${err.toString()}`);
    })
  }
}

const doContractCall = async (privateKey, address) => {
  const network = new StacksTestnet();
  const txOptions = {
    contractAddress: address,
    contractName: 'hello_world',
    functionName: 'set-value',
    functionArgs: [bufferCVFromString('foo'), bufferCVFromString('bar')],
    senderKey: privateKey,
    fee: new BN(1000),
    network,
    postConditionMode: PostConditionMode.Allow
  };

  const transaction = await makeContractCall(txOptions);
  return broadcastTransaction(transaction, network).then(() => {
    return transaction.txid();
  })
}

module.exports = function reseed(redisClient) {
  const redisGetAsync = promisify(redisClient.get).bind(redisClient);
  return redisGetAsync(reseedingStepKey)
    .then((reseedStep) => {
      if (reseedStep) {
        const stepInt = parseInt(reseedStep);
        if (stepInt >= ReseedingSteps.Setup) {
          switch (stepInt) {
            case ReseedingSteps.Setup:
              return setup(redisClient);
            case ReseedingSteps.TokenTransfer:
              return createTokenTransfer(redisClient);
            case ReseedingSteps.ContractDeploy:
              return createContractDeploy(redisClient);
            case ReseedingSteps.ContractCall:
              return createContractCall(redisClient);
            default:
              redisClient.set(reseedingStepKey, ReseedingSteps.NotReseeding.toString());
          }
        }
      }
    });
}
