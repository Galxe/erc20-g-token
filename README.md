# G Token

This is the official repository for G Token.

The G Token is a new token contract replacing the old token `GAL`, proposed in
[GP25](https://dao.galxe.com/#/proposal/0x8d3f386c3b0cb9fa170d4231c65f18bd45ea1402b90a70116e1101c22e62ed01).

There are 3 contracts in this repository:

- `GravityTokenG.sol`: The main new ERC20 token contract, the G token. This token contract natively supports minter
  management for making G a native cross-chain token. Each minter will have limited minting power within a time window.
  Minters are enumerable. Implementation of this management is in `LimitedMinterManager.sol`.
- `TokenUpgrader.sol`: A contract to upgrade the GAL token to the G token.
- `TokenVesting.sol`: A simple token vesting contract.

## Deployment

The contracts have been deployed at the following addresses:

### G Token

Token Name: Gravity

Token Symbol: G

Initial Total Supply: 12,000,000,000 G

Contract Address: `0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649`

Networks:

- [Ethereum](https://etherscan.io/token/0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649#code)
  - Owner: [Safe multi-sig on Ethereum](https://etherscan.io/address/0xbD6e434dB90FD8AD4E28d85C133AD34cA6fbfB6D)
  - Initial supply: 10,000,000,000 G
- [BNB Chain](https://bscscan.com/token/0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649#code)
  - Owner: [Safe multi-sig on BNB Chain](https://bscscan.com/address/0xBB86C74ecCA362D007293EE8A2E24E9De0B9E558)
  - Initial supply: 2,000,000,000 G
- [Base](https://basescan.org/token/0x9c7beba8f6ef6643abd725e45a4e8387ef260649#code)
  - Owner: [Safe multi-sig on Base](https://basescan.org/address/0x08bDCC846D80d81eF6e058bB64228Ec58CA6726a)
  - Initial supply: 0 G
  - Note: G tokens will be bridged from other networks to Base network.

G tokens can be natively bridged to deployed network via our official bridge, using cross-chain message protocols.

### Token Upgrader

Address: `0x249aC00402716b7bf6d6ED24531d7B4C10788942`

Only available on networks where the old GAL token is deployed:

- [Ethereum](https://etherscan.io/address/0x249aC00402716b7bf6d6ED24531d7B4C10788942#code)
  - Owner: [Safe multi-sig on Ethereum](https://etherscan.io/address/0xbD6e434dB90FD8AD4E28d85C133AD34cA6fbfB6D)
- [BNB Chain](https://bscscan.com/address/0x249aC00402716b7bf6d6ED24531d7B4C10788942#code)
  - Owner: [Safe multi-sig on BNB Chain](https://bscscan.com/address/0xBB86C74ecCA362D007293EE8A2E24E9De0B9E558)

### G Token OFT

For chains that do not have G token contract deployed natively, we use Layerzero's OFT standard to bring G token to
those chains.

- Token Name: `GravityTokenG (OFT)`
- Token Symbol: `G.oft`

Deployed networks:

- [Polygon](https://polygonscan.com/address/0x7653235DA659c8e573B365B16EE95b847A1777ba)
  - Owner: [Safe multi-sig on Polygon](https://polygonscan.com/address/0x897a91caf592c42fcc953da16890c50372e63c61)
  - Initial supply: 0 G (minted on demand by bridging from Ethereum mainnet)
- More to come...

Security configurations:

- [OFT Adapter](https://etherscan.io/address/0x71c066fd4949C44B2cB2f509E2CD2421FbD36bca) on Ethereum mainnet:
  `0x71c066fd4949C44B2cB2f509E2CD2421FbD36bca`
  - Owner: [Safe multi-sig on Ethereum](https://etherscan.io/address/0xbD6e434dB90FD8AD4E28d85C133AD34cA6fbfB6D)
- Ethereum -> Polygon
  - Confirmation required: 15
  - [LayerZero Labs](https://docs.layerzero.network/v2/developers/evm/technical-reference/dvn-addresses#layerzero-labs):
    `0x589dEDbD617e0CBcB916A9223F4d1300c294236b`
  - [Google Cloud](https://docs.layerzero.network/v2/developers/evm/technical-reference/dvn-addresses#google-cloud):
    `0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc`
- Polygon -> Ethereum
  - Confirmation required: 512
  - [LayerZero Labs](https://docs.layerzero.network/v2/developers/evm/technical-reference/dvn-addresses#layerzero-labs):
    `0x23DE2FE932d9043291f870324B74F820e11dc81A`
  - [Google Cloud](https://docs.layerzero.network/v2/developers/evm/technical-reference/dvn-addresses#google-cloud):
    `0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc`
