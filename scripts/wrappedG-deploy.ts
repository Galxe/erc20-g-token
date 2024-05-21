import hre from "hardhat";

import WrappedGModule from "../ignition/modules/WrappedG";

const salt = "0x" + "0".repeat(64);

async function main() {
  const network = process.env.HARDHAT_NETWORK;
  const { wG } = await hre.ignition.deploy(WrappedGModule, {
    strategy: "create2",
    strategyConfig: {
      salt,
    },
    // Somehow necessary for Gravity chain to work.
    // see https://github.com/NomicFoundation/hardhat-ignition/issues/725
    config: {
      requiredConfirmations: 1,
    },
  });
  const addr = await wG.getAddress();
  console.log(`(${network}) wG Token deployed to: ${addr}`);
}

main().catch(console.error);
