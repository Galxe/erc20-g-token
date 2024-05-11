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
