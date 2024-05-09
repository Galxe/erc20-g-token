import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { GalxeTokenG } from "../typechain-types";
import { generateRandomWallet } from "./helpers/wallet";
import { toBigInt, BigNumberish } from "ethers";

describe("Vesting", function () {
    async function deployVestingFixture() {
        const [deployer, owner, acc1, acc2, acc3] = await ethers.getSigners();
        const TokenFactory = await ethers.getContractFactory("GalxeTokenG");
        const token = await TokenFactory.deploy(owner.address);
        const twoBillionToken = toBigInt("2000000000000000000000000000");
        await token.connect(owner).ownerMint(deployer.address, twoBillionToken)
        return { deployer, token, owner, acc1, acc2, acc3 };
    }

    async function deployVesting(
        deployer: SignerWithAddress,
        beneficiary: string,
        token: GalxeTokenG,
        start: BigNumberish,
        duration: BigNumberish,
        count: BigNumberish,
        amount: BigNumberish,
    ) {
        const VestingFactory = await ethers.getContractFactory("TokenVesting");
        const vesting = await VestingFactory.deploy(
            beneficiary, await token.getAddress(), start, duration, count);

        // transfer money to vesting
        await token.connect(deployer).transfer(await vesting.getAddress(), amount);

        return vesting;
    }

    function vestTimePoints(
        start: number,
        duration: number,
        count: number,
    ): number[] {
        let rv = [];
        for (let i = 1; i <= count; i++) {
            rv.push(start + duration * i);
        }
        return rv;
    }

    describe("deploy", function () {
        it("non-zero token address", async function () {
            const latestTime = await time.latest();
            const VestingFactory = await ethers.getContractFactory("TokenVesting");
            await expect(VestingFactory.deploy(
                (await generateRandomWallet()).address, ethers.ZeroAddress, latestTime, 1000, 1000))
                .to.be.rejectedWith("InvalidToken");
        });
        it("invalid vesting parameters", async function () {
            const latestTime = await time.latest();
            const { deployer, token } = await loadFixture(deployVestingFixture);
            const tokenAddress = await token.getAddress()
            const VestingFactory = await ethers.getContractFactory("TokenVesting");
            await expect(VestingFactory.deploy(
                deployer.address, tokenAddress, latestTime, 0, 1))
                .to.be.rejectedWith("InvalidDuration");
            await expect(VestingFactory.deploy(
                deployer.address, tokenAddress, latestTime, 100, 0))
                .to.be.rejectedWith("InvalidNumVestings");
            await expect(VestingFactory.deploy(
                deployer.address, tokenAddress, 0, 100, 1))
                .to.be.rejectedWith("InvalidFinalTime");
            // overflow
            await expect(VestingFactory.deploy(
                deployer.address, tokenAddress, 0,
                toBigInt("9999999999999999999999999999999999999999"),
                toBigInt("9999999999999999999999999999999999999999")))
                .to.be.revertedWithPanic;
        });
        it("correct parameters", async function () {
            const latestTime = await time.latest();
            const { deployer, token } = await loadFixture(deployVestingFixture);
            const tokenAddress = await token.getAddress()
            const VestingFactory = await ethers.getContractFactory("TokenVesting");
            await expect(VestingFactory.deploy(
                deployer.address, tokenAddress, latestTime, 100, 1))
                .not.to.be.reverted;
        });
    });

    describe("Correct vesting", function () {
        it("1-time vesting, 1000 wei token, 100 seconds", async function () {
            const { deployer, token } = await loadFixture(deployVestingFixture);
            const tokenAddress = await token.getAddress()
            const latestTime = await time.latest();
            const duration = 100;
            const nVest = 1;
            const vestTps = vestTimePoints(latestTime, duration, nVest);
            console.log("current time: ", latestTime);
            console.log("vesting time points: ", vestTps);
            const beneficiary = await generateRandomWallet();
            const randomPpl = await generateRandomWallet();
            const vesting = await deployVesting(
                deployer, beneficiary.address, token, latestTime, duration, nVest, 1000);

            expect(await vesting.token()).to.equal(tokenAddress);
            expect(await vesting.owner()).to.equal(beneficiary.address);
            expect(await vesting.start()).to.equal(latestTime);
            expect(await vesting.duration()).to.equal(duration);
            expect(await vesting.numVestings()).to.equal(nVest);
            expect(await vesting.released()).to.equal(0);
            expect(await vesting.releasableAmount()).to.equal(0);
            await expect(vesting.connect(randomPpl).release())
                .to.be.revertedWithCustomError(vesting, "NoTokenReleasable");

            // forward to 98 seconds later, nothing should be changed.
            // NOTE: cannot forward to 99 seconds later because test will mine a new block and
            // increase blocktime by 1 before any non-view non-pure function call.
            await time.increaseTo(latestTime + 98);
            await expect(vesting.connect(randomPpl).release())
                .to.be.revertedWithCustomError(vesting, "NoTokenReleasable");
            expect(await vesting.released()).to.equal(0);
            expect(await vesting.releasableAmount()).to.equal(0);

            await time.increaseTo(vestTps[0]);
            // owner should be able to to withdraw all amount now.
            // before withdraw status
            expect(await vesting.released()).to.equal(0);
            expect(await vesting.releasableAmount()).to.equal(1000);
            expect(await token.balanceOf(await vesting.getAddress())).to.equal(1000);
            expect(await token.balanceOf(beneficiary.address)).to.equal(0);
            // withdraw
            await expect(vesting.connect(randomPpl).release())
                .not.to.be.reverted;
            // post-withdraw
            expect(await vesting.released()).to.equal(1000);
            expect(await vesting.releasableAmount()).to.equal(0);
            expect(await token.balanceOf(await vesting.getAddress())).to.equal(0);
            expect(await token.balanceOf(beneficiary.address)).to.equal(1000);
        });

        it("3 times vesting, 1000 wei token, 1000 seconds duration, 200 seconds cliff", async function () {
            const { deployer, token } = await loadFixture(deployVestingFixture);
            const latestTime = await time.latest();
            const startAt = latestTime + 200;
            const duration = 1000;
            const nVest = 3;
            const vestTps = vestTimePoints(startAt, duration, nVest);
            console.log("current time: ", latestTime);
            console.log("vesting time points: ", vestTps);
            const beneficiary = await generateRandomWallet();
            const randomPpl = await generateRandomWallet();
            const vesting = await deployVesting(
                deployer, beneficiary.address, token, startAt, duration, nVest, 1000);

            // before cliff
            await time.increaseTo(latestTime + 100);
            expect(await vesting.released()).to.equal(0);
            expect(await vesting.releasableAmount()).to.equal(0);
            await expect(vesting.connect(randomPpl).release()).to.be.reverted;

            // after cliff but before first vesting
            await time.increaseTo(latestTime + 500);
            expect(await vesting.released()).to.equal(0);
            expect(await vesting.releasableAmount()).to.equal(0);
            await expect(vesting.connect(randomPpl).release()).to.be.reverted;

            // first
            await time.increaseTo(vestTps[0]);
            await expect(vesting.connect(randomPpl).release())
                .not.to.be.reverted;
            expect(await vesting.released()).to.equal(333);
            expect(await vesting.releasableAmount()).to.equal(0);
            expect(await token.balanceOf(await vesting.getAddress())).to.equal(667);
            expect(await token.balanceOf(beneficiary.address)).to.equal(333);
            // second
            await time.increaseTo(vestTps[1]);
            await expect(vesting.connect(randomPpl).release())
                .not.to.be.reverted;
            expect(await vesting.released()).to.equal(666);
            expect(await vesting.releasableAmount()).to.equal(0);
            expect(await token.balanceOf(await vesting.getAddress())).to.equal(334);
            expect(await token.balanceOf(beneficiary.address)).to.equal(666);
            // withdraw all remaining
            await time.increaseTo(vestTps[2]);
            expect(await vesting.released()).to.equal(666);
            expect(await vesting.releasableAmount()).to.equal(334);
            await expect(vesting.connect(randomPpl).release())
                .not.to.be.reverted;
            expect(await vesting.released()).to.equal(1000);
            expect(await vesting.releasableAmount()).to.equal(0);
            expect(await token.balanceOf(await vesting.getAddress())).to.equal(0);
            expect(await token.balanceOf(beneficiary.address)).to.equal(1000);
        });
    });
});
