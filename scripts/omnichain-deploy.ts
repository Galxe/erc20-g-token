import { keccak256, toUtf8Bytes } from "ethers";
import hre from "hardhat";

import GravityGTokenModule from "../ignition/modules/GravityTokenG";
import TokenUpgraderModule from "../ignition/modules/TokenUpgrader";

const salt = keccak256(toUtf8Bytes("Gravity G Token"));

// Galxe ERC20 Token deployer
const deployer = "0x397b9dAb337f286f169C5bcF2810Aea2Dce1ee13";

const decimals = BigInt(10) ** BigInt(18);

interface ChainConfig {
  deployer: string;
  gal_address?: string;
  multi_sig: string;
  init_supply: bigint;
}

const configs: { [key: string]: ChainConfig } = {
  mainnet: {
    deployer,
    gal_address: "0x5fAa989Af96Af85384b8a938c2EdE4A7378D9875",
    multi_sig: "0xbD6e434dB90FD8AD4E28d85C133AD34cA6fbfB6D",
    init_supply: 10_000_000_000n * decimals, // 10 billion
  },
  bsc: {
    deployer,
    gal_address: "0xe4Cc45Bb5DBDA06dB6183E8bf016569f40497Aa5",
    multi_sig: "0xBB86C74ecCA362D007293EE8A2E24E9De0B9E558",
    init_supply: 2_000_000_000n * decimals, // 2 billion
  },
  base: {
    deployer,
    multi_sig: "0x08bDCC846D80d81eF6e058bB64228Ec58CA6726a",
    init_supply: 0n * decimals, // 0
  },
};

async function main() {
  const network = process.env.HARDHAT_NETWORK;
  if (network === undefined) {
    throw new Error("HARDHAT_NETWORK is not set");
  } else if (configs[network] === undefined) {
    throw new Error(`Chain config for ${network} not found`);
  }
  const config = configs[network];
  console.log(`(${network}) Deploying to ${network}...`);
  console.log(`(${network}) init_supply: ${config.init_supply}`)
  const { g } = await hre.ignition.deploy(GravityGTokenModule, {
    strategy: "create2",
    strategyConfig: {
      salt,
    },
    parameters: {
      GravityTokenG: {
        deployer: config.deployer,
        multi_sig: config.multi_sig,
        init_supply: config.init_supply,
      },
    },
  });
  const gTokenAddress = await g.getAddress();
  console.log(`(${network}) G Token deployed to: ${gTokenAddress}`);
  // deploy upgrader
  if (config.gal_address !== undefined) {
    const { upgrader } = await hre.ignition.deploy(TokenUpgraderModule, {
      strategy: "create2",
      strategyConfig: {
        salt,
      },
      parameters: {
        TokenUpgraderModule: {
          deployer: config.deployer,
          gal_address: config.gal_address,
          g_address: gTokenAddress,
          multi_sig: config.multi_sig,
        },
      },
    });
    console.log(`(${network}) Token Upgrader deployed to: ${await upgrader.getAddress()}`);
  }
}

main().catch(console.error);
