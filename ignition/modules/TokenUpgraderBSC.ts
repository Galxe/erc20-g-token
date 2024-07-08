import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenUpgraderModule = buildModule("TokenUpgraderBSCModule", (m) => {
  const deployer = m.getParameter("deployer");
  const galAddr = m.getParameter("gal_address");
  const gAddr = m.getParameter("g_address");
  const multiSigAddr = m.getParameter("multi_sig");

  // initialize upgrader with chain-specific values
  const upgrader = m.contract("TokenUpgraderBSC", [deployer]);
  m.call(upgrader, "initialize", [galAddr, gAddr]);

  // transfer ownerships
  m.call(upgrader, "transferOwnership", [multiSigAddr]);

  return { upgrader };
});

export default TokenUpgraderModule;
