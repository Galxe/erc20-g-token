import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-solhint";
import { keccak256 } from "ethers";
import { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";

// explorer api keys
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");

// deployer keys
const DEPLOYER_PRIVATE_KEY = vars.get("DEPLOYER_PRIVATE_KEY");
const accounts = [DEPLOYER_PRIVATE_KEY];

const salt = keccak256("Gravity G Token");
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
  ignition: {
    strategyConfig: {
      create2: {
        salt: salt,
      },
    },
  },
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
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
