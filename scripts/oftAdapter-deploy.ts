import { keccak256, toUtf8Bytes } from "ethers";
import hre from "hardhat";

import G_OFTAdapterModule from "../ignition/modules/G_OFTAdapter";

const salt = keccak256(toUtf8Bytes("G OFTAdapter"));

const testnetDeployer = "0x000C775C5818D02b8b5df524CCfFF2E5D1A1FE88";

// Galxe ERC20 Token deployer
const deployer = "0x397b9dAb337f286f169C5bcF2810Aea2Dce1ee13";

interface ChainConfig {
  deployer: string;
  lz_endpoint: string;
  g_token: string;
  owner: string;
}

const configs: { [key: string]: ChainConfig } = {
  sepolia: {
    deployer: testnetDeployer,
    lz_endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    g_token: "0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649",
    owner: testnetDeployer,
  },
  mainnet: {
    deployer: deployer,
    lz_endpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    g_token: "0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649",
    owner: deployer, // we will manually update owner to multisig later
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
  const { gOFTAdapter } = await hre.ignition.deploy(G_OFTAdapterModule, {
    strategy: "create2",
    strategyConfig: {
      salt,
    },
    parameters: {
      G_OFTAdapter: {
        deployer: config.deployer,
        g_token: config.g_token,
        lz_endpoint: config.lz_endpoint,
        owner: config.owner,
      },
    },
  });
  const gOFTAdapterAddress = await gOFTAdapter.getAddress();
  console.log(`(${network}) G OFTAdapter deployed to: ${gOFTAdapterAddress}`);
}

main().catch(console.error);
