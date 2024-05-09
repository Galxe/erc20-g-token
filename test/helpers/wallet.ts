import { ethers } from "hardhat";
import { HDNodeWallet } from "ethers";

// Generates random wallet and connects it to hardhat provider, sets balance to 100 ETH
export async function generateRandomWallet(): Promise<HDNodeWallet> {
   // Connect to Hardhat Provider
   const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
   // Set balance
   await ethers.provider.send("hardhat_setBalance", [
       wallet.address,
       "0x56BC75E2D6310000000", // 10000 ETH
   ]);
   return wallet;
}