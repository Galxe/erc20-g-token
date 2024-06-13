import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const G_OFTAdapterModule = buildModule("G_OFTAdapter", (m) => {
  const gTokenAddr = m.getParameter("g_token");
  const lzEndpointAddr = m.getParameter("lz_endpoint");
  const ownerAddr = m.getParameter("owner");

  const gOFTAdapter = m.contract("G_OFTAdapter", [
    gTokenAddr, // token
    lzEndpointAddr, // lzEndpoint
    ownerAddr, // owner
  ]);
  return { gOFTAdapter };
});

export default G_OFTAdapterModule;
