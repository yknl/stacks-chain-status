# Stacks Chain Status

This is a simple node.js app that checks the status of the Stacks blockchain testnet. It also sends out a series of transactions including token transfer, contract deploy and contract function call transactions as part of the status check. The main page is served by express.js and data storage is handled by Redis.

## Install Redis
You will need to run a Redis server on your machine. On macOS, the easiest method of installation requires [Homebrew](http://brew.sh/). With Homebrew set up, you can install redis:

```shell
brew install redis
```

## Install dependencies

```shell
npm install
```

## Run in dev environment

```shell
npm run dev
```