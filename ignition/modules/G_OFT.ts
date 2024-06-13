import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const G_OFTModule = buildModule("G_OFT", (m) => {
  const lzEndpointAddr = m.getParameter("lz_endpoint");
  const ownerAddr = m.getParameter("owner");

  const gOFT = m.contract("G_OFT", [
    "GravityTokenG (OFT)", // name
    "G.oft", // symbol
    lzEndpointAddr, // lzEndpoint
    ownerAddr, // delegate
  ]);
  return { gOFT };
});

export default G_OFTModule;
