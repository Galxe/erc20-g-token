import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("GalxeTokenG", function () {
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function basicFixture() {
    // Contracts are deployed using the first signer/account by default
    const [deployer, daoOwner, bridge1, bridge2, otherAccount] = await hre.ethers.getSigners();

    const TokenG = await hre.ethers.getContractFactory("GalxeTokenG");
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
        "ILimitedMinter_NotEnoughLimits",
      );
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
        "ILimitedMinter_NotEnoughLimits",
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
        "ILimitedMinter_NotEnoughLimits",
      );
      expect(await g.balanceOf(otherAccount.address)).to.equal(1600);
    });
  });
});
