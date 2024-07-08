import { keccak256, toUtf8Bytes } from "ethers";
import hre from "hardhat";

import TokenUpgraderBSCModule from "../ignition/modules/TokenUpgraderBSC";

const salt = keccak256(toUtf8Bytes("Gravity G Token"));

// Galxe ERC20 Token deployer
const deployer = "0x397b9dAb337f286f169C5bcF2810Aea2Dce1ee13";

interface ChainConfig {
  deployer: string;
  g_address: string;
  gal_address: string;
  multi_sig: string;
}

const configs: { [key: string]: ChainConfig } = {
  bsc: {
    deployer,
    g_address: "0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649",
    gal_address: "0xe4Cc45Bb5DBDA06dB6183E8bf016569f40497Aa5",
    multi_sig: "0xBB86C74ecCA362D007293EE8A2E24E9De0B9E558",
  },
};

async function main() {
  const network = process.env.HARDHAT_NETWORK;
  if (network === undefined) {
    throw new Error("HARDHAT_NETWORK is not set");
  } else if (configs[network] === undefined) {
    throw new Error(`Chain must be BSC, got ${network}`);
  }
  const config = configs[network];
  const { upgrader } = await hre.ignition.deploy(TokenUpgraderBSCModule, {
    strategy: "create2",
    strategyConfig: {
      salt,
    },
    parameters: {
      TokenUpgraderBSCModule: {
        deployer: config.deployer,
        gal_address: config.gal_address,
        g_address: config.g_address,
        multi_sig: config.multi_sig,
      },
    },
  });
  console.log(`(${network}) Token Upgrader deployed to: ${await upgrader.getAddress()}`);
}

main().catch(console.error);
