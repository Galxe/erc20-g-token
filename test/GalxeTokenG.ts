import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { math } from "../typechain-types/@openzeppelin/contracts/utils";
import { generateRandomWallet } from "./helpers/wallet";

describe("GalxeTokenG", function () {
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function basicFixture() {
    // Contracts are deployed using the first signer/account by default
    const [deployer, daoOwner, bridge1, bridge2, otherAccount] = await ethers.getSigners();

    const TokenG = await ethers.getContractFactory("GalxeTokenG");
    const g = await TokenG.deploy(deployer);

    return { TokenG, g, deployer, daoOwner, bridge1, bridge2, otherAccount };
  }

  describe("Deployment", function () {
    it("initial owner should be deployer", async function () {
      const { g, deployer } = await loadFixture(basicFixture);
      expect(await g.owner()).to.equal(deployer.address);
    });

    it("basic parameters should be set correctly", async function () {
      const { g, deployer } = await loadFixture(basicFixture);
      expect(await g.name()).to.equal("Galxe");
      expect(await g.symbol()).to.equal("G");
      expect(await g.decimals()).to.equal(18);
      expect(await g.DOMAIN_SEPARATOR()).to.equal("0xb246dccf02b4f765668b933c581678a54657aee1b6220eb6d057f6139948def8");
    });
  });

  describe("Change Token Name", async function () {
    it("owner can change token name", async function () {
      const { g, deployer } = await loadFixture(basicFixture);
      await g.connect(deployer).setName("NewName");
      expect(await g.name()).to.equal("NewName");
    });

    it("non-owner cannot change token name", async function () {
      const { TokenG, g, daoOwner } = await loadFixture(basicFixture);
      await expect(g.connect(daoOwner).setName("NewName")).to.be.revertedWithCustomError(
        TokenG,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("Ownership", function () {
    it("owner can transfer ownership by 2step", async function () {
      const { g, deployer, daoOwner } = await loadFixture(basicFixture);
      await g.connect(deployer).transferOwnership(daoOwner.address);
      // until acceptOwnership, ownership is still deployer
      expect(await g.owner()).to.equal(deployer.address);
      // acceptOwnership
      await g.connect(daoOwner).acceptOwnership();
      expect(await g.owner()).to.equal(daoOwner.address);
    });

    it("non-owner cannot transfer ownership", async function () {
      const { TokenG, g, daoOwner } = await loadFixture(basicFixture);
      await expect(g.connect(daoOwner).transferOwnership(daoOwner.address)).to.be.revertedWithCustomError(
        TokenG,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("pause", function () {
    it("pause and unpause", async function () {
      const { g, deployer, daoOwner } = await loadFixture(basicFixture);
      await expect(g.connect(daoOwner).pause()).to.be.revertedWithCustomError(g, "OwnableUnauthorizedAccount");
      await g.pause();
      expect(await g.paused()).to.equal(true);
      await g.unpause()
      expect(await g.paused()).to.equal(false);

    });
  });

  describe("name", function () {
    it("set name", async function () {
      const { g, deployer, daoOwner } = await loadFixture(basicFixture);
      await expect(g.connect(daoOwner).setName("TokenG1")).to.be.revertedWithCustomError(g, "OwnableUnauthorizedAccount");
      await g.setName("TokenG1");
      expect(await g.name()).to.equal("TokenG1");

    });
  });

  describe("Mint", function () {
    it("owner can mint", async function () {
      const { g, deployer, otherAccount } = await loadFixture(basicFixture);
      await g.connect(deployer).ownerMint(otherAccount.address, 100);
      expect(await g.balanceOf(otherAccount.address)).to.equal(100);
    });

    it("non-owner cannot mint", async function () {
      const { TokenG, g, daoOwner } = await loadFixture(basicFixture);
      await expect(g.connect(daoOwner).mint(daoOwner.address, 100)).to.be.revertedWithCustomError(
        TokenG,
        "ILimitedMinterManager_NotEnoughLimits",
      );
    });

    it("add and remove minter", async function () {
      const { TokenG, g, deployer, bridge1, bridge2 } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 1500, 10);
      await g.connect(deployer).setMinterLimit(bridge2.address, 1500, 10);
      expect(await g.getMinterCount()).to.equal(2);
      expect(await g.getMinterByIndex(0)).to.equal(bridge1.address);
      expect(await g.getMinterByIndex(1)).to.equal(bridge2.address);
      // incorrect index hint will revert
      expect(g.connect(deployer).removeMinterByIndexHint(bridge2.address, 0)).to.be.revertedWithCustomError(
        TokenG,
        "ILimitedMinterManager_InvalidIndexHint",
      );
      await g.connect(deployer).removeMinterByIndexHint(bridge2.address, 1);
      expect(await g.getMinterCount()).to.equal(1);
      expect(await g.getMinterByIndex(0)).to.equal(bridge1.address);
      expect(await g.mintingMaxLimitOf(bridge1.address)).to.equal(1500);
      expect(await g.mintingMaxLimitOf(bridge2.address)).to.equal(0);
      expect(await g.mintingCurrentLimitOf(bridge1.address)).to.equal(1500);
      expect(await g.mintingCurrentLimitOf(bridge2.address)).to.equal(0);
    });

    it("add and then remove all minters", async function () {
      const { TokenG, g, deployer, bridge1, bridge2 } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 1500, 10);
      await g.connect(deployer).setMinterLimit(bridge2.address, 1500, 10);
      await g.connect(deployer).removeMinterByIndexHint(bridge2.address, 1);
      await g.connect(deployer).removeMinterByIndexHint(bridge1.address, 0);
      expect(await g.getMinterCount()).to.equal(0);
    });

    it("add and then remove all minters reversely ordered", async function () {
      const { TokenG, g, deployer, bridge1, bridge2 } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 1500, 10);
      await g.connect(deployer).setMinterLimit(bridge2.address, 1500, 10);
      await g.connect(deployer).removeMinterByIndexHint(bridge1.address, 0);
      await g.connect(deployer).removeMinterByIndexHint(bridge2.address, 0);
      expect(await g.getMinterCount()).to.equal(0);
    });

    it("bridge can mint", async function () {
      const { g, deployer, bridge1, otherAccount } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 1500, 10);
      await g.connect(bridge1).mint(otherAccount.address, 1234);
      expect(await g.balanceOf(otherAccount.address)).to.equal(1234);
    });

    it("bridge cannot mint more than limit", async function () {
      const { TokenG, g, deployer, bridge1, otherAccount } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 1500, 10);
      await expect(g.connect(bridge1).mint(otherAccount.address, 1501)).to.be.revertedWithCustomError(
        TokenG,
        "ILimitedMinterManager_NotEnoughLimits",
      );
    });

    it("bridge can mint more after time passed", async function () {
      const { g, deployer, bridge1, otherAccount } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 1500, 10);
      await g.connect(bridge1).mint(otherAccount.address, 1500);
      expect(await g.balanceOf(otherAccount.address)).to.equal(1500);
      await time.increase(10);
      await g.connect(bridge1).mint(otherAccount.address, 10);
      expect(await g.balanceOf(otherAccount.address)).to.equal(1510);
    });

    it("bridge can mint propotionally more after some time passed", async function () {
      const { TokenG, g, deployer, bridge1, otherAccount } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 1000, 10);
      await g.connect(bridge1).mint(otherAccount.address, 1000);
      // 1 second passed after mint
      expect(await g.balanceOf(otherAccount.address)).to.equal(1000);
      await time.increase(5);
      await g.connect(bridge1).mint(otherAccount.address, 600); // 5 + 1 = 6 seconds passed, 1000 * (6/10) = 600
      // 1 second passed after mint
      await expect(g.connect(bridge1).mint(otherAccount.address, 101)).to.be.revertedWithCustomError(
        TokenG,
        "ILimitedMinterManager_NotEnoughLimits",
      );
      expect(await g.balanceOf(otherAccount.address)).to.equal(1600);
    });
  });

  describe("setMinterLimit", function () {
    it("limits too high", async function () {
      const { g, deployer, bridge1 } = await loadFixture(basicFixture);
      await expect(g.connect(deployer).setMinterLimit(bridge1.address, ethers.MaxUint256, 10)).to.be.revertedWithCustomError(g, "ILimitedMinterManager_LimitsTooHigh");
    });

    it("duration is zero", async function () {
      const { g, deployer, bridge1 } = await loadFixture(basicFixture);
      await expect(g.connect(deployer).setMinterLimit(bridge1.address, 100, 0)).to.be.revertedWithCustomError(g, "ILimitedMinterManager_InvalidDuration");
    });

    it("set the minter", async function () {
      const { g, deployer, bridge1 } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 100, 10)
      const minterCfg = await g.getMinterConfig(bridge1.address);
      expect(minterCfg.maxLimit).to.be.eq(100);
      expect(minterCfg.duration).to.be.eq(10);
      expect(minterCfg.currentLimit).to.be.eq(100);
    });

    it("increase limit", async function () {
      // first set
      const { g, deployer, bridge1, otherAccount } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 100, 10)
      let minterCfg = await g.getMinterConfig(bridge1.address);
      expect(minterCfg.maxLimit).to.be.eq(100);
      expect(minterCfg.duration).to.be.eq(10);
      expect(minterCfg.currentLimit).to.be.eq(100);

      // no mint increase limit
      await g.connect(deployer).setMinterLimit(bridge1.address, 200, 10)
      minterCfg = await g.getMinterConfig(bridge1.address);
      expect(minterCfg.maxLimit).to.be.eq(200);
      expect(minterCfg.duration).to.be.eq(10);
      expect(minterCfg.currentLimit).to.be.eq(200);

      // increase limit after mint 100 and 2 seconds passed
      await g.connect(bridge1).mint(otherAccount.address, 100);
      await time.increase(2);
      await g.connect(deployer).setMinterLimit(bridge1.address, 300, 10)
      minterCfg = await g.getMinterConfig(bridge1.address);
      expect(minterCfg.maxLimit).to.be.eq(300);
      expect(minterCfg.duration).to.be.eq(10);
      expect(minterCfg.currentLimit).to.be.eq(260); // 100 + (2 * 300 / 10) + 100

      // increase limit after mint 100 and 9 seconds passed
      await time.increase(8);
      await g.connect(deployer).setMinterLimit(bridge1.address, 400, 10)
      minterCfg = await g.getMinterConfig(bridge1.address);
      expect(minterCfg.maxLimit).to.be.eq(400);
      expect(minterCfg.duration).to.be.eq(10);
      expect(minterCfg.currentLimit).to.be.eq(400); // more than maxLimit, so currentLimit = maxLimit
    });

    it("decrease limit", async function () {
      // first set
      const { g, deployer, bridge1, otherAccount } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 300, 10)
      let minterCfg = await g.getMinterConfig(bridge1.address);
      expect(minterCfg.maxLimit).to.be.eq(300);
      expect(minterCfg.duration).to.be.eq(10);
      expect(minterCfg.currentLimit).to.be.eq(300);

      // no mint decrease limit
      await g.connect(deployer).setMinterLimit(bridge1.address, 200, 10);
      minterCfg = await g.getMinterConfig(bridge1.address);
      expect(minterCfg.maxLimit).to.be.eq(200);
      expect(minterCfg.duration).to.be.eq(10);
      expect(minterCfg.currentLimit).to.be.eq(200);

      // decrease limit after mint 100 and 2 seconds passed
      await g.connect(bridge1).mint(otherAccount.address, 100);
      await time.increase(2);
      await g.connect(deployer).setMinterLimit(bridge1.address, 20, 10)
      minterCfg = await g.getMinterConfig(bridge1.address);
      expect(minterCfg.maxLimit).to.be.eq(20);
      expect(minterCfg.duration).to.be.eq(10);
      expect(minterCfg.currentLimit).to.be.eq(0);
    });
  });

  describe("mintingCurrentLimitOf", function () {
    it("not minter", async function () {
      const { g, deployer, bridge1 } = await loadFixture(basicFixture);
      expect(await g.mintingCurrentLimitOf(bridge1.address)).to.be.eq(0);
    });

    it("set limit and no use", async function () {
      const { g, deployer, bridge1 } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 300, 10)
    });

    it("mint 100 and 2 seconds passed", async function () {
      const { g, deployer, bridge1 } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 300, 10)

      await g.connect(bridge1).mint(bridge1.address, 100);
      await time.increase(2);
      expect(await g.mintingCurrentLimitOf(bridge1.address)).to.be.eq(260); // 200 + (2 * 300 / 10) =
    });

    it("mint 100 and 9 seconds passed", async function () {
      const { g, deployer, bridge1 } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 300, 10)

      await g.connect(bridge1).mint(bridge1.address, 100);
      await time.increase(9);
      expect(await g.mintingCurrentLimitOf(bridge1.address)).to.be.eq(300); // 200 + (9 * 300 / 10) = 470, more than maxLimit
    });

    it("mint 100 and exceeding duration time", async function () {
      const { g, deployer, bridge1 } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 300, 10)

      await g.connect(bridge1).mint(bridge1.address, 300);
      await time.increase(20);
      expect(await g.mintingCurrentLimitOf(bridge1.address)).to.be.eq(300);
    });
  });

  describe("getMinterCount", function () {
    it("getMinterCount", async function () {
      const { g, deployer, bridge1 } = await loadFixture(basicFixture);
      expect(await g.getMinterCount()).to.be.eq(0);
      await g.connect(deployer).setMinterLimit(bridge1.address, 300, 10)
      expect(await g.getMinterCount()).to.be.eq(1);
    });
  });

  describe("getMinterByIndex", function () {
    it("getMinterByIndex", async function () {
      const { TokenG, g, deployer, bridge1 } = await loadFixture(basicFixture);
      await g.connect(deployer).setMinterLimit(bridge1.address, 300, 10)
      expect(await g.getMinterByIndex(0)).to.be.eq(bridge1.address);
      expect(await g.getMinterByIndex(1)).to.be.revertedWithCustomError(g, "ILimitedMinterManager_InvalidIndex");
    });
  });

  describe("removeMinterByIndexHint", function () {
    it("removeMinterByIndexHint", async function () {
      const { g, deployer, bridge1 } = await loadFixture(basicFixture);
      const user = await generateRandomWallet()
      expect(await g.removeMinterByIndexHint(user, 0)).to.be.revertedWithCustomError(g, "ILimitedMinterManager_InvalidIndex");
      await g.connect(deployer).setMinterLimit(bridge1.address, 300, 10)
      expect(await g.removeMinterByIndexHint(user, 0)).to.be.revertedWithCustomError(g, "ILimitedMinterManager_InvalidIndexHint");
      
      await g.removeMinterByIndexHint(bridge1, 0);
      expect(await g.getMinterCount()).to.be.eq(0);
    });
  });

});
