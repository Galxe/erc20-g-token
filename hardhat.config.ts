import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-solhint";
import { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";

// explorer api keys
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");
const BSCSCAN_API_KEY = vars.get("BSCSCAN_API_KEY");
const BASESCAN_API_KEY = vars.get("BASESCAN_API_KEY");

// deployer keys
const DEPLOYER_PRIVATE_KEY = vars.get("GALXE_DEPLOYER_PRIVATE_KEY");
const accounts = [DEPLOYER_PRIVATE_KEY];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 2000,
      },
    },
  },
  // we don't directly use ignition, instead, they are used in scripts.
  // ignition: {
  //   strategyConfig: {
  //     create2: {
  //       salt: salt,
  //     },
  //   },
  // },
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
      mainnet: ETHERSCAN_API_KEY,
      bsc: BSCSCAN_API_KEY,
      base: BASESCAN_API_KEY,
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: "https://rpc.ankr.com/eth_sepolia",
      chainId: 11155111,
      accounts,
    },
    bsc: {
      url: "https://bsc-dataseed1.binance.org",
      chainId: 56,
      accounts,
    },
    polygon: {
      url: "https://rpc.ankr.com/polygon",
      chainId: 137,
      accounts,
    },
    mainnet: {
      url: "https://cloudflare-eth.com",
      chainId: 1,
      accounts,
    },
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts
    }
  },
};

export default config;
