import { expect } from "chai";
import { network } from "hardhat";

describe("DecentralizedID", function () {
  async function deploy() {
    const { ethers } = await network.connect();
    const [owner, alice, bob, carol, dave, eve] = await ethers.getSigners();
    const f = await ethers.getContractFactory("DecentralizedID");
    const did = await f.deploy(owner.address);
    await did.waitForDeployment();
    return { ethers, did, owner, alice, bob, carol, dave, eve };
  }

  it("registers a DID for a user", async function () {
    const { did, alice } = await deploy();
    await expect(did.connect(alice).registerIdentity("QmTest123"))
      .to.emit(did, "IdentityRegistered")
      .withArgs(alice.address, "QmTest123");
  });

  it("registerDID is an alias for the same registry flow", async function () {
    const { did, alice } = await deploy();
    await expect(did.connect(alice).registerDID("did:polygon:0xabc"))
      .to.emit(did, "IdentityRegistered")
      .withArgs(alice.address, "did:polygon:0xabc");
  });

  it("prevents duplicate DID registration", async function () {
    const { did, alice } = await deploy();
    await did.connect(alice).registerIdentity("QmA");
    await expect(did.connect(alice).registerIdentity("QmB")).to.be.revertedWithCustomError(
      did,
      "AlreadyRegistered",
    );
  });

  it("adds and counts vouches correctly", async function () {
    const { did, alice, bob } = await deploy();
    await did.connect(alice).registerIdentity("QmA");
    await expect(did.connect(bob).addVouch(alice.address))
      .to.emit(did, "VouchAdded")
      .withArgs(bob.address, alice.address);
    expect(await did.getVouchCount(alice.address)).to.equal(1n);
  });

  it("prevents self-vouching", async function () {
    const { did, alice } = await deploy();
    await did.connect(alice).registerIdentity("QmA");
    await expect(did.connect(alice).addVouch(alice.address)).to.be.revertedWithCustomError(
      did,
      "SelfVouch",
    );
  });

  it("prevents duplicate vouches", async function () {
    const { did, alice, bob } = await deploy();
    await did.connect(alice).registerIdentity("QmA");
    await did.connect(bob).addVouch(alice.address);
    await expect(did.connect(bob).addVouch(alice.address)).to.be.revertedWithCustomError(
      did,
      "AlreadyVouched",
    );
  });

  it("isEligibleBorrower is false with less than 3 vouches", async function () {
    const { did, alice, bob, carol } = await deploy();
    await did.connect(alice).registerIdentity("QmA");
    await did.connect(bob).addVouch(alice.address);
    await did.connect(carol).addVouch(alice.address);
    expect(await did.isEligibleBorrower(alice.address)).to.equal(false);
  });

  it("isEligibleBorrower is true with 3 or more vouches", async function () {
    const { did, alice, bob, carol, dave } = await deploy();
    await did.connect(alice).registerIdentity("QmA");
    await did.connect(bob).addVouch(alice.address);
    await did.connect(carol).addVouch(alice.address);
    await did.connect(dave).addVouch(alice.address);
    expect(await did.isEligibleBorrower(alice.address)).to.equal(true);
  });
});
