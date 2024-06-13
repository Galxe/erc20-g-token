// Once OFT contracts are deployed, we need to call setPeer to setup connection
// between OFT contracts.
import { AbiCoder, Contract } from "ethers";
import { ethers } from "hardhat";

const testnetDeployer = "0x000C775C5818D02b8b5df524CCfFF2E5D1A1FE88";

// Galxe ERC20 Token deployer
const deployer = "0x397b9dAb337f286f169C5bcF2810Aea2Dce1ee13";

const lzEndpointAbi = [
  "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)",
];
const ulnConfigStructType = [
  "tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)",
];
const executorConfigAbi = ["tuple(uint32 maxMessageSize, address executorAddress)"];
const lzExecutorConfigType = 1; // 1 for executor
const lzUlnConfigType = 2; // 2 for UlnConfig

interface ChainConfig {
  admin: string;
  oft_address?: string;
  oft_adapter_address?: string;
  lz_endpoint: string;
  lz_sendlib_address: string;
  lz_receivelib_address: string;
  peers: [
    {
      eid: number;
      peer_address: string;
    },
  ];
}

const configs: { [key: string]: ChainConfig } = {
  mainnet: {
    admin: deployer,
    oft_adapter_address: "0x71c066fd4949C44B2cB2f509E2CD2421FbD36bca",
    lz_endpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    lz_sendlib_address: "0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1",
    lz_receivelib_address: "0xc02Ab410f0734EFa3F14628780e6e695156024C2",
    peers: [
      {
        // polygon
        eid: 30109,
        // oft
        peer_address: ethers.zeroPadValue("0x7653235DA659c8e573B365B16EE95b847A1777ba", 32),
      },
    ],
  },
  sepolia: {
    admin: testnetDeployer,
    oft_adapter_address: "0x831B73c38e5E066D3652c8682D5485e0AA10ACFd",
    lz_endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    lz_sendlib_address: "0xcc1ae8Cf5D3904Cef3360A9532B477529b177cCE",
    lz_receivelib_address: "0xdAf00F5eE2158dD58E0d3857851c432E34A3A851",
    peers: [
      {
        // polygonAmoy
        eid: 40267,
        // oft
        peer_address: ethers.zeroPadValue("0x16b27dDfdce588a3D58D7be8b7721E2f56aB54D9", 32),
      },
    ],
  },
  polygon: {
    admin: deployer,
    oft_address: "0x7653235DA659c8e573B365B16EE95b847A1777ba",
    lz_endpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    lz_sendlib_address: "0x6c26c61a97006888ea9E4FA36584c7df57Cd9dA3",
    lz_receivelib_address: "0x1322871e4ab09Bc7f5717189434f97bBD9546e95",
    peers: [
      {
        // mainnet
        eid: 30101,
        // oft adapter
        peer_address: ethers.zeroPadValue("0x71c066fd4949C44B2cB2f509E2CD2421FbD36bca", 32),
      },
    ],
  },
  polygonAmoy: {
    admin: testnetDeployer,
    oft_address: "0x16b27dDfdce588a3D58D7be8b7721E2f56aB54D9",
    lz_endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    lz_sendlib_address: "0x1d186C560281B8F1AF831957ED5047fD3AB902F9",
    lz_receivelib_address: "0x53fd4C4fBBd53F6bC58CaE6704b92dB1f360A648",
    peers: [
      {
        // sepolia
        eid: 40161,
        // oft adapter
        peer_address: ethers.zeroPadValue("0x831B73c38e5E066D3652c8682D5485e0AA10ACFd", 32),
      },
    ],
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
  const signer = await ethers.getSigner(config.admin);
  const lzEndpointContract = new ethers.Contract(config.lz_endpoint, lzEndpointAbi, signer);

  if (config.oft_adapter_address !== undefined) {
    console.log(`(${network}) Configuring OFTAdaptor ${config.oft_adapter_address}`);

    let adapterContract = await ethers.getContractAt("G_OFTAdapter", config.oft_adapter_address, signer);
    for (const peer of config.peers) {
      await printOAppConfig(
        lzEndpointContract,
        config.oft_adapter_address,
        config.lz_sendlib_address,
        config.lz_receivelib_address,
        peer.eid,
      );

      // even this is a read function, we still need to set gasLimit somehow
      const isPeer = await adapterContract.isPeer(peer.eid, peer.peer_address, { gasLimit: 100000 });
      if (isPeer) {
        console.log(`(${network}) (${peer.eid}, ${peer.peer_address}): Already a peer, skipping...`);
        continue;
      }
      // setup peer
      const resp = await adapterContract.setPeer(peer.eid, peer.peer_address, { gasLimit: 100000 });
      console.log(`(${network}) Set Peer (${peer.eid}, ${peer.peer_address}): ${resp.hash}`);
    }
  } else if (config.oft_address !== undefined) {
    console.log(`(${network}) Configuring OFT ${config.oft_address}`);

    let oftContract = await ethers.getContractAt("G_OFT", config.oft_address, signer);
    for (const peer of config.peers) {
      await printOAppConfig(
        lzEndpointContract,
        config.oft_address,
        config.lz_sendlib_address,
        config.lz_receivelib_address,
        peer.eid,
      );

      // even this is a read function, we still need to set gasLimit somehow
      const isPeer = await oftContract.isPeer(peer.eid, peer.peer_address, { gasLimit: 100000 });
      if (isPeer) {
        console.log(`(${network}) (${peer.eid}, ${peer.peer_address}): Already a peer, skipping...`);
        continue;
      }
      // setup peer
      const resp = await oftContract.setPeer(peer.eid, peer.peer_address, { gasLimit: 100000 });
      console.log(`(${network}) Set Peer (${peer.eid}, ${peer.peer_address}): ${resp.hash}`);
    }
  } else {
    throw new Error("Either OFTAdaptor or OFT contract address must be provided");
  }
}

async function printOAppConfig(
  lzEndpointContract: Contract,
  oappAddress: string,
  sendLibAddress: string,
  receiveLibAddress: string,
  peerEid: number,
) {
  const sendExecutorConfigBytes = await lzEndpointContract.getConfig(
    oappAddress,
    sendLibAddress,
    peerEid,
    lzExecutorConfigType,
  );
  const executorConfigArray = AbiCoder.defaultAbiCoder().decode(executorConfigAbi, sendExecutorConfigBytes);
  console.log(
    `Send Library Executor\n`,
    `Max Message Size: ${executorConfigArray.at(0).maxMessageSize}\n`,
    `Executor Address: ${executorConfigArray.at(0).executorAddress}`,
  );

  const sendUlnConfigBytes = await lzEndpointContract.getConfig(oappAddress, sendLibAddress, peerEid, lzUlnConfigType);
  const sendUlnConfigArray = AbiCoder.defaultAbiCoder().decode(ulnConfigStructType, sendUlnConfigBytes);
  console.log(
    `Send Library ULN\n`,
    `Confirmations: ${sendUlnConfigArray.at(0).confirmations}\n`,
    `Required DVN Count: ${sendUlnConfigArray.at(0).requiredDVNCount}\n`,
    `Optional DVN Count: ${sendUlnConfigArray.at(0).optionalDVNCount}\n`,
    `Optional DVN Threshold: ${sendUlnConfigArray.at(0).optionalDVNThreshold}\n`,
    `Required DVNs: ${sendUlnConfigArray.at(0).requiredDVNs}\n`,
    `Optional DVNs: ${sendUlnConfigArray.at(0).optionalDVNs}`,
  );

  // Fetch and decode for receiveLib (only ULN Config)
  const receiveUlnConfigBytes = await lzEndpointContract.getConfig(
    oappAddress,
    receiveLibAddress,
    peerEid,
    lzUlnConfigType,
  );
  const receiveUlnConfigArray = AbiCoder.defaultAbiCoder().decode(ulnConfigStructType, receiveUlnConfigBytes);
  console.log(
    `Receive Library ULN\n`,
    `Confirmations: ${receiveUlnConfigArray.at(0).confirmations}\n`,
    `Required DVN Count: ${receiveUlnConfigArray.at(0).requiredDVNCount}\n`,
    `Optional DVN Count: ${receiveUlnConfigArray.at(0).optionalDVNCount}\n`,
    `Optional DVN Threshold: ${receiveUlnConfigArray.at(0).optionalDVNThreshold}\n`,
    `Required DVNs: ${receiveUlnConfigArray.at(0).requiredDVNs}\n`,
    `Optional DVNs: ${receiveUlnConfigArray.at(0).optionalDVNs}`,
  );
}

main().catch(console.error);
