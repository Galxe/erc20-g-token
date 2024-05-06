import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const initOwner = "0x2Bad6BeD9e25466e0429a2D0Ea0e5350b2B3965d";

const GalxeTokenGModule = buildModule("GalxeTokenG", (m) => {
  const g = m.contract("GalxeTokenG", [initOwner]);

  return { g };
});

export default GalxeTokenGModule;
