import { expect } from "chai";
import { network } from "hardhat";

describe("ReputationNFT", function () {
  async function deploy() {
    const { ethers } = await network.connect();
    const [owner, factory, user] = await ethers.getSigners();
    const f = await ethers.getContractFactory("ReputationNFT");
    const nft = await f.deploy(owner.address);
    await nft.waitForDeployment();
    await nft.connect(owner).setAuthorized(factory.address, true);
    return { ethers, nft, owner, factory, user };
  }

  it("mints the correct tier for a given score", async function () {
    const { nft, factory, user } = await deploy();
    await nft.connect(factory).mintReputation(user.address, 100);
    expect(await nft.getTier(100)).to.equal(1n);
    const id = 1n;
    expect(await nft.balanceOf(user.address, id)).to.equal(1n);
  });

  it("is not transferable (reverts on transfer)", async function () {
    const { nft, factory, user, owner } = await deploy();
    await nft.connect(factory).mintReputation(user.address, 400);
    const balIds = [];
    for (let i = 1n; i <= 5n; i++) {
      if ((await nft.balanceOf(user.address, i)) > 0n) balIds.push(i);
    }
    expect(balIds.length).to.equal(1);
    const tid = balIds[0];
    await expect(
      nft.connect(user).safeTransferFrom(user.address, owner.address, tid, 1, "0x"),
    ).to.be.revertedWithCustomError(nft, "Soulbound");
  });

  it("burns NFT on default path", async function () {
    const { nft, factory, user } = await deploy();
    await nft.connect(factory).mintReputation(user.address, 300);
    await nft.connect(factory).burnReputation(user.address);
    expect(await nft.trustScoreOf(user.address)).to.equal(0n);
  });

  it("upgrades tier on score increase", async function () {
    const { nft, factory, user } = await deploy();
    await nft.connect(factory).mintReputation(user.address, 200);
    await nft.connect(factory).upgradeReputation(user.address, 600);
    expect(await nft.getTier(600)).to.equal(3n);
    expect(await nft.trustScoreOf(user.address)).to.equal(600n);
  });
});
