module.exports = {
  pingTimeout: 5000,
  nodeInfoURL: 'http://testnet-master.blockstack.org:20443/v2/info',
  neonNodeInfoURL: 'http://neon.blockstack.org/v2/info',
  sidecarURL: 'https://sidecar.staging.blockstack.xyz/sidecar/v1/status',
  sidecarTxURL: 'https://sidecar.staging.blockstack.xyz/sidecar/v1/tx',
  explorerURL: 'https://testnet-explorer.blockstack.org/',
  faucetURL: 'https://sidecar.staging.blockstack.xyz/sidecar/v1/faucets/stx?address=',
  masterNodeKey: 'master_node_ping',
  sidecarKey: 'sidecar_ping',
  explorerKey: 'explorer_ping',
  lastStacksChainTipHeightKey: 'last_stacks_chain_tip_height',
  lastStacksChainTipHeightTimeKey: 'last_stacks_chain_tip_height_time',
  lastBurnBlockHeightKey: 'last_burn_block_height',
  lastBurnBlockHeightTimeKey: 'last_burn_block_height_time',
  lastChainResetKey: 'last_chain_reset',
  reseedingStepKey: 'reseeding_step',
  reseedNextBlockKey: 'reseed_next_block',
  reseedTryCountKey: 'reseed_try_count',
  reseedMaxTryCount: 5,
  reseedAbortErrorKey: 'reseed_abort_error_key',
  reseedRandomKey: 'reseed_random_key',
  reseedRandomAddress: 'reseed_random_address',
  ReseedingSteps: {
    NotReseeding: 0,
    Setup: 1,
    TokenTransfer: 2,
    ContractDeploy: 3,
    ContractCall: 4,
  },
  reseedStepMinBlocks: 2,
  seededFaucetTxKey: 'seeded_faucet_tx',
  seededTokenTransferTxKey: 'seeded_token_transfer_tx',
  seededContractDeployTxKey: 'seeded_contract_deploy_tx',
  seededContractCallTxKey: 'seeded_contract_call_tx',
  seededFaucetTxStatusKey: 'seeded_faucet_tx_status',
  seededTokenTransferTxStatusKey: 'seeded_token_transfer_tx_status',
  seededContractDeployTxStatusKey: 'seeded_contract_deploy_tx_status',
  seededContractCallTxStatusKey: 'seeded_contract_call_tx_status',
  seededFaucetTxBroadcastTimeKey: 'seeded_faucet_tx_broadcast_time',
  seededTokenTransferTxBroadcastTimeKey: 'seeded_token_transfer_tx_broadcast_time',
  seededContractDeployTxBroadcastTimeKey: 'seeded_contract_deploy_tx_broadcast_time',
  seededContractCallTxBroadcastTimeKey: 'seeded_contract_call_tx_broadcast_time',
}
