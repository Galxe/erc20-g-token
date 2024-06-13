import { keccak256, toUtf8Bytes } from "ethers";
import hre from "hardhat";

import G_OFTModule from "../ignition/modules/G_OFT";

const salt = keccak256(toUtf8Bytes("G OFT"));

const testnetDeployer = "0x000C775C5818D02b8b5df524CCfFF2E5D1A1FE88";

// Galxe ERC20 Token deployer
const deployer = "0x397b9dAb337f286f169C5bcF2810Aea2Dce1ee13";

interface ChainConfig {
  deployer: string;
  lz_endpoint: string;
  owner: string;
}

// LayerZero endpoints can be found here:
// https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts
const configs: { [key: string]: ChainConfig } = {
  polygonAmoy: {
    deployer: testnetDeployer,
    lz_endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    owner: testnetDeployer,
  },
  polygon: {
    deployer: deployer,
    lz_endpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    owner: deployer,
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
  const { gOFT } = await hre.ignition.deploy(G_OFTModule, {
    strategy: "create2",
    strategyConfig: {
      salt,
    },
    parameters: {
      G_OFT: {
        deployer: config.deployer,
        lz_endpoint: config.lz_endpoint,
        owner: config.owner,
      },
    },
  });
  const gOFTAddress = await gOFT.getAddress();
  console.log(`(${network}) G OFT deployed to: ${gOFTAddress}`);
}

main().catch(console.error);
