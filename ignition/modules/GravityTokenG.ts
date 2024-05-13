import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GravityTokenGModule = buildModule("GravityTokenG", (m) => {
  const deployer = m.getParameter("deployer");
  const multiSigAddr = m.getParameter("multi_sig");
  const initSupply = m.getParameter("init_supply");

  const g = m.contract("GravityTokenG", [deployer]);
  // mint initial supply to multisig
  m.call(g, "ownerMint", [multiSigAddr, initSupply])
  m.call(g, "transferOwnership", [multiSigAddr]);
  return { g };
});

export default GravityTokenGModule;
