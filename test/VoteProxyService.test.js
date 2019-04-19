import {
  takeSnapshot,
  restoreSnapshot,
  setupTestMakerInstance,
  linkAccounts,
  sendMkrToAddress,
  setUpAllowance,
  setupTestchainClient
} from './helpers';
import VoteProxyService from '../src/VoteProxyService';
import VoteProxy from '../src/VoteProxy';

let snapshotId,
  maker,
  addresses,
  voteProxyService,
  voteProxyFactory,
  chiefService,
  client;

// TODO remove this & other jest.setTimeout when promise/resolve gets finished
jest.setTimeout(60000);

beforeAll(async () => {
  client = await setupTestchainClient();
  snapshotId = await takeSnapshot(client, 'thur2');

  maker = await setupTestMakerInstance();

  voteProxyService = maker.service('voteProxy');
  voteProxyFactory = maker.service('voteProxyFactory');
  chiefService = maker.service('chief');

  addresses = maker
    .listAccounts()
    .reduce((acc, cur) => ({ ...acc, [cur.name]: cur.address }), {});

  console.log('addresses', addresses);

  await linkAccounts(maker, addresses.ali, addresses.ava);
});

afterAll(async () => {
  await restoreSnapshot(client, snapshotId);
});

// TODO retest these create tests, or remove them
// test('can create VP Service', async () => {
//   const vps = maker.service('voteProxy');
//   expect(vps).toBeInstanceOf(VoteProxyService);
// });

test('can lock an amount of MKR', async () => {
  const sendAmount = 5;
  const amountToLock = 3;
  await sendMkrToAddress(maker, addresses.owner, addresses.ali, sendAmount);

  maker.useAccount('ali');

  console.log('address to send addresses.ali', addresses.ali);

  const { voteProxy } = await voteProxyService.getVoteProxy(addresses.ali);

  console.log('voteprox', voteProxy);

  const vpAddress = voteProxy.getProxyAddress();

  await setUpAllowance(maker, vpAddress, voteProxy.getColdAddress());

  // No deposits prior to locking maker
  const preLockDeposits = await chiefService.getNumDeposits(vpAddress);
  expect(preLockDeposits.toNumber()).toBe(0);

  await voteProxyService.lock(vpAddress, amountToLock);

  const postLockDeposits = await chiefService.getNumDeposits(vpAddress);
  expect(postLockDeposits.toNumber()).toBe(amountToLock);
});

test('can cast an executive vote and retrieve voted on addresses from slate', async () => {
  const { voteProxy } = await voteProxyService.getVoteProxy(addresses.ali);
  const vpAddress = voteProxy.getProxyAddress();
  const picks = [
    '0x26EC003c72ebA27749083d588cdF7EBA665c0A1D',
    '0x54F4E468FB0297F55D8DfE57336D186009A1455a'
  ];

  await voteProxyService.voteExec(vpAddress, picks);

  const addressesVotedOn = await voteProxyService.getVotedProposalAddresses(
    vpAddress
  );
  console.log('addressesVotedOn worked', addressesVotedOn);
  expect(addressesVotedOn).toEqual(picks);
});

// test('can free an amount of MKR', async () => {
//   const amountToFree = 1;
//   const { voteProxy } = await voteProxyService.getVoteProxy(addresses.ali);
//   console.log('voteProxy', voteProxy);
//   const vpAddress = voteProxy.getProxyAddress();
//   console.log('vpAddress', vpAddress);

//   const preFreeDeposits = await chiefService.getNumDeposits(vpAddress);
//   console.log('preFreeDeposits', preFreeDeposits);
//   await voteProxyService.free(vpAddress, amountToFree);
//   console.log('free working');

//   const postFreeDeposits = await chiefService.getNumDeposits(vpAddress);
//   console.log(
//     'POST FREE DEOPOSITS',
//     postFreeDeposits,
//     preFreeDeposits.toNumber() - amountToFree
//   );
//   expect(postFreeDeposits.toNumber()).toBe(
//     preFreeDeposits.toNumber() - amountToFree
//   );
//   console.log('test 4over');
// });

// test('can free all MKR', async () => {
//   const { voteProxy } = await voteProxyService.getVoteProxy(addresses.ali);
//   const vpAddress = voteProxy.getProxyAddress();

//   const preFreeDeposits = await chiefService.getNumDeposits(vpAddress);
//   expect(preFreeDeposits.toNumber()).toBeGreaterThan(0);

//   await voteProxyService.freeAll(vpAddress);

//   const postFreeDeposits = await chiefService.getNumDeposits(vpAddress);
//   expect(postFreeDeposits.toNumber()).toBe(0);
// });

test('getVoteProxy returns a VoteProxy if one exists for a given address', async () => {
  const address = addresses.ali;
  const { hasProxy, voteProxy } = await voteProxyService.getVoteProxy(address);

  expect(hasProxy).toBe(true);
  expect(voteProxy).toBeInstanceOf(VoteProxy);
});

test('getVoteProxy returns a null if none exists for a given address', async () => {
  const address = addresses.sam;
  const { hasProxy, voteProxy } = await voteProxyService.getVoteProxy(address);

  expect(hasProxy).toBe(false);
  expect(voteProxy).toBeNull();
});
