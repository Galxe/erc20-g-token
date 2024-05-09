import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { toBigInt, toUtf8Bytes } from "ethers";
import { ethers } from "hardhat";

import { token } from "../typechain-types/@openzeppelin/contracts";
import { math } from "../typechain-types/@openzeppelin/contracts/utils";
import { getPermitSignature } from "./helpers/signature";
import { generateRandomWallet } from "./helpers/wallet";

describe("TokenUpgrader", function () {
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function basicFixture() {
    // Contracts are deployed using the first signer/account by default
    const [deployer, daoOwner] = await ethers.getSigners();

    const tokenUpgraderF = await ethers.getContractFactory("TokenUpgrader");
    const tokenUpgrader = await tokenUpgraderF.deploy(deployer);
    const tokenGF = await ethers.getContractFactory("GalxeTokenG");
    const tokenG = await tokenGF.deploy(deployer);
    const oldToken = await tokenGF.deploy(deployer);

    await oldToken.ownerMint(deployer, 1000000);
    await tokenG.ownerMint(tokenUpgrader, 2000000);

    return { tokenUpgrader, deployer, daoOwner, tokenG, oldToken };
  }

  describe("Deployment", function () {
    it("initial owner should be deployer", async function () {
      const { tokenUpgrader, deployer } = await loadFixture(basicFixture);
      expect(await tokenUpgrader.owner()).to.equal(deployer.address);
    });
  });

  describe("Ownership", function () {
    it("owner can transfer ownership by 2step", async function () {
      const { tokenUpgrader, deployer, daoOwner } = await loadFixture(basicFixture);
      await tokenUpgrader.connect(deployer).transferOwnership(daoOwner.address);
      // until acceptOwnership, ownership is still deployer
      expect(await tokenUpgrader.owner()).to.equal(deployer.address);
      // acceptOwnership
      await tokenUpgrader.connect(daoOwner).acceptOwnership();
      expect(await tokenUpgrader.owner()).to.equal(daoOwner.address);
    });

    it("non-owner cannot transfer ownership", async function () {
      const { tokenUpgrader, daoOwner } = await loadFixture(basicFixture);
      await expect(tokenUpgrader.connect(daoOwner).transferOwnership(daoOwner.address)).to.be.revertedWithCustomError(
        tokenUpgrader,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("Initialize", function () {
    it("non-owner cannot initialize", async function () {
      const { tokenUpgrader, tokenG, oldToken, daoOwner } = await loadFixture(basicFixture);
      await expect(tokenUpgrader.connect(daoOwner).initialize(oldToken, tokenG)).to.be.revertedWithCustomError(
        tokenUpgrader,
        "OwnableUnauthorizedAccount",
      );
    });

    it("initialize", async function () {
      const { tokenUpgrader, tokenG, oldToken } = await loadFixture(basicFixture);
      await tokenUpgrader.initialize(oldToken, tokenG);
      expect(await tokenUpgrader.oldToken()).to.equal(oldToken);
      expect(await tokenUpgrader.newToken()).to.equal(tokenG);
      expect(await tokenUpgrader.initialized()).to.equal(true);
    });

    it("repeated initialize", async function () {
      const { tokenUpgrader, tokenG, oldToken } = await loadFixture(basicFixture);
      await tokenUpgrader.initialize(oldToken, tokenG);
      await expect(tokenUpgrader.initialize(oldToken, tokenG)).to.be.revertedWithCustomError(
        tokenUpgrader,
        "AlreadyInitialized",
      );
    });
  });

  describe("Pause", function () {
    it("non-owner cannot pause", async function () {
      const { tokenUpgrader, tokenG, oldToken, daoOwner } = await loadFixture(basicFixture);
      await expect(tokenUpgrader.connect(daoOwner).pause()).to.be.revertedWithCustomError(
        tokenUpgrader,
        "OwnableUnauthorizedAccount",
      );
    });

    it("pause", async function () {
      const { tokenUpgrader, tokenG, oldToken } = await loadFixture(basicFixture);
      await tokenUpgrader.pause();
      expect(await tokenUpgrader.paused()).to.equal(true);
    });

    it("unpause", async function () {
      const { tokenUpgrader, tokenG, oldToken } = await loadFixture(basicFixture);
      await tokenUpgrader.pause();
      await tokenUpgrader.unpause();
      expect(await tokenUpgrader.paused()).to.equal(false);
    });
  });

  describe("UpgradeToken", function () {
    it("uninitialized", async function () {
      const { tokenUpgrader, tokenG, oldToken, daoOwner } = await loadFixture(basicFixture);
      await expect(tokenUpgrader.connect(daoOwner).upgradeToken(0)).to.be.revertedWithCustomError(
        tokenUpgrader,
        "Uninitialized",
      );
    });

    it("paused", async function () {
      const { tokenUpgrader, tokenG, oldToken } = await loadFixture(basicFixture);
      await tokenUpgrader.initialize(oldToken, tokenG);
      await tokenUpgrader.pause();
      await expect(tokenUpgrader.upgradeToken(0)).to.be.revertedWithCustomError(tokenUpgrader, "EnforcedPause");
    });

    it("successful upgradeToken", async function () {
      const { tokenUpgrader, tokenG, oldToken } = await loadFixture(basicFixture);
      await tokenUpgrader.initialize(oldToken, tokenG);
      const user1 = await generateRandomWallet();
      await oldToken.transfer(user1.address, 1000);
      await oldToken.connect(user1).approve(tokenUpgrader, 1000);
      await tokenUpgrader.connect(user1).upgradeToken(1000);

      // await expect(tokenUpgrader.upgradeToken(1000))
      expect(await oldToken.balanceOf(user1.address)).to.equal(0);
      expect(await tokenG.balanceOf(user1.address)).to.equal(60000);
    });
  });

  describe("upgradeTokenByPermit", function () {
    it("uninitialized", async function () {
      const { tokenUpgrader, tokenG, oldToken, daoOwner } = await loadFixture(basicFixture);
      const signature = await getPermitSignature(daoOwner, oldToken, await tokenUpgrader.getAddress(), 1000, 1000,{name:"Galxe G Token"});
      await expect(
        tokenUpgrader.upgradeTokenByPermit(0, 0, signature.v, signature.r, signature.s),
      ).to.be.revertedWithCustomError(tokenUpgrader, "Uninitialized");
    });

    it("paused", async function () {
      const { tokenUpgrader, tokenG, oldToken, daoOwner } = await loadFixture(basicFixture);
      await tokenUpgrader.initialize(oldToken, tokenG);
      await tokenUpgrader.pause();
      const signature = await getPermitSignature(daoOwner, oldToken, await tokenUpgrader.getAddress(), 1000, 1000,{name:"Galxe G Token"});
      await expect(
        tokenUpgrader.upgradeTokenByPermit(0, 0, signature.v, signature.r, signature.s),
      ).to.be.revertedWithCustomError(tokenUpgrader, "EnforcedPause");
    });

    it("failed to permit", async function () {
      const { tokenUpgrader, tokenG, oldToken } = await loadFixture(basicFixture);
      await tokenUpgrader.initialize(oldToken, tokenG);
      const user1 = await generateRandomWallet();
      const signature = await getPermitSignature(user1, oldToken, await tokenUpgrader.getAddress(), 1000, 0,{name:"Galxe G Token"});
      await oldToken.transfer(user1.address, 1000);
      await expect(
        tokenUpgrader.connect(user1).upgradeTokenByPermit(1000, 0, signature.v, signature.r, signature.s),
      ).to.be.revertedWithCustomError(oldToken, "ERC20InsufficientAllowance");
    });

    it("successful upgrade token by permit", async function () {
      const { tokenUpgrader, tokenG, oldToken } = await loadFixture(basicFixture);
      await tokenUpgrader.initialize(oldToken, tokenG);
      const user1 = await generateRandomWallet();
      const deadline = (await time.latest()) + 1000;
      const signature = await getPermitSignature(user1, oldToken, await tokenUpgrader.getAddress(), 1000, deadline,{name:"Galxe G Token"});
      await oldToken.transfer(user1.address, 1000);
      await tokenUpgrader.connect(user1).upgradeTokenByPermit(1000, deadline, signature.v, signature.r, signature.s);
      // await expect(tokenUpgrader.upgradeToken(1000))
      expect(await oldToken.balanceOf(user1.address)).to.equal(0);
      expect(await tokenG.balanceOf(user1.address)).to.equal(60000);
    });
  });

  describe("WithdrawERC20Token", function () {
    it("non-owner cannot withdraw", async function () {
      const { tokenUpgrader, tokenG, oldToken, daoOwner } = await loadFixture(basicFixture);
      await expect(
        tokenUpgrader.connect(daoOwner).withdrawERC20Token(oldToken, daoOwner, 1000),
      ).to.be.revertedWithCustomError(tokenUpgrader, "OwnableUnauthorizedAccount");
    });

    it("withdraw", async function () {
      const { tokenUpgrader, tokenG, oldToken, daoOwner } = await loadFixture(basicFixture);
      await tokenUpgrader.withdrawERC20Token(tokenG, daoOwner, 1000);
      expect(await tokenG.balanceOf(daoOwner.address)).to.equal(1000);
    });
  });

  describe("withdrawETH", function () {
    it("non-owner cannot withdraw", async function () {
      const { tokenUpgrader, tokenG, oldToken, daoOwner } = await loadFixture(basicFixture);
      await expect(tokenUpgrader.connect(daoOwner).withdrawETH(daoOwner, 10)).to.be.revertedWithCustomError(
        tokenUpgrader,
        "OwnableUnauthorizedAccount",
      );
    });

    it("withdrawETH", async function () {
      const { tokenUpgrader, tokenG, oldToken, daoOwner } = await loadFixture(basicFixture);
      await ethers.provider.send("hardhat_setBalance", [
        await tokenUpgrader.getAddress(),
        "0x56BC75E2D6310000000", // 10000 ETH
      ]);

      const oldBalance = await ethers.provider.getBalance(daoOwner.address);
      await tokenUpgrader.withdrawETH(daoOwner, 10);
      expect(await ethers.provider.getBalance(daoOwner.address)).to.equal(oldBalance + toBigInt(10));
    });
  });
});
