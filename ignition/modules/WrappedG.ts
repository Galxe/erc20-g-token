import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const WrappedGModule = buildModule("WrappedG", (m) => {
  const wG = m.contract("WrappedG", []);
  return { wG };
});

export default WrappedGModule;
