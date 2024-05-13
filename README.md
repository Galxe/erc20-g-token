# Gravity G Token

This is the official repository for the Gravity G Token.

The Gravity G Token is a new token replacing the old token `GAL`, proposed in
[GP25](https://dao.galxe.com/#/proposal/0x8d3f386c3b0cb9fa170d4231c65f18bd45ea1402b90a70116e1101c22e62ed01).

There are 3 contracts in this repository:

- `GravityTokenG.sol`: The main new ERC20 token contract, the G token. This token contract natively supports minter
  management for making G a native cross-chain token. Each minter will have limited minting power within a time window.
  Minters are enumerable. Implementation of this management is in `LimitedMinterManager.sol`.
- `TokenUpgrader.sol`: A contract to upgrade the old GAL token to the new G token.
- `TokenVesting.sol`: A simple token vesting contract.

## Deployment

The contracts have deployed at the following address:

### G Token

Address: `0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649`.

Networks:

- [Mainnet](https://etherscan.io/address/0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649#code)
  - Owner: [Galxe multi-sig on mainnet](https://etherscan.io/address/0xbD6e434dB90FD8AD4E28d85C133AD34cA6fbfB6D)
  - Initial supply: 10,000,000,000 G
- [BSC](https://bscscan.com/address/0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649#code)
  - Owner: [Galxe multi-sig on bsc](https://bscscan.com/address/0xBB86C74ecCA362D007293EE8A2E24E9De0B9E558)
  - Initial supply: 2,000,000,000 G
- [Base](https://basescan.org/address/0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649#code)
  - Owner: [Galxe multi-sig on base](https://basescan.org/address/0x08bDCC846D80d81eF6e058bB64228Ec58CA6726a)
  - Initial supply: 0 G
  - Note: We will bridge G tokens from other networks to Base network in the future.
- More to come

G tokens can be natively bridged to deployed network via our official bridge, using cross-chain message protocols.

### Token Upgrader

Address: `0x249aC00402716b7bf6d6ED24531d7B4C10788942`.

Only available on networks where the old GAL token is deployed:

- [Mainnet](https://etherscan.io/address/0x249aC00402716b7bf6d6ED24531d7B4C10788942#code)
  - Owner: [Galxe multi-sig on mainnet](https://etherscan.io/address/0xbD6e434dB90FD8AD4E28d85C133AD34cA6fbfB6D)
- [BSC](https://bscscan.com/address/0x249aC00402716b7bf6d6ED24531d7B4C10788942#code)
  - Owner: [Galxe multi-sig on bsc](https://bscscan.com/address/0xBB86C74ecCA362D007293EE8A2E24E9De0B9E558)
