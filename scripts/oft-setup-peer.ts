// Once OFT contracts are deployed, we need to call setPeer to setup connection
// between OFT contracts.
import { ethers } from "hardhat";

const testnetDeployer = "0x000C775C5818D02b8b5df524CCfFF2E5D1A1FE88";

// Galxe ERC20 Token deployer
const deployer = "0x397b9dAb337f286f169C5bcF2810Aea2Dce1ee13";

interface ChainConfig {
  admin: string;
  oft_address?: string;
  oft_adapter_address?: string;
  peers: [
    {
      eid: number;
      peer_address: string;
    },
  ];
}

const configs: { [key: string]: ChainConfig } = {
  sepolia: {
    admin: testnetDeployer,
    oft_adapter_address: "0x831B73c38e5E066D3652c8682D5485e0AA10ACFd",
    peers: [
      {
        // polygonAmoy
        eid: 40267,
        peer_address: ethers.zeroPadValue("0x16b27dDfdce588a3D58D7be8b7721E2f56aB54D9", 32),
      },
    ],
  },
  polygonAmoy: {
    admin: testnetDeployer,
    oft_address: "0x16b27dDfdce588a3D58D7be8b7721E2f56aB54D9",
    peers: [
      {
        // sepolia
        eid: 40161,
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

  if (config.oft_adapter_address !== undefined) {
    console.log(`(${network}) Configuring OFTAdaptor ${config.oft_adapter_address}`);

    let adapterContract = await ethers.getContractAt("G_OFTAdapter", config.oft_adapter_address, signer);
    for (const peer of config.peers) {
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

main().catch(console.error);
