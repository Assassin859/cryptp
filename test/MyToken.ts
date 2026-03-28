import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("MyToken", function () {
  it("Should deploy with correct initial supply", async function () {
    const MyToken = await ethers.getContractFactory("MyToken");
    const myToken = await MyToken.deploy();
    await myToken.waitForDeployment();

    const totalSupply = await myToken.totalSupply();
    expect(totalSupply).to.equal(ethers.parseEther("1000000"));
  });

  it("Should have correct name and symbol", async function () {
    const MyToken = await ethers.getContractFactory("MyToken");
    const myToken = await MyToken.deploy();
    await myToken.waitForDeployment();

    expect(await myToken.name()).to.equal("MyTokenName");
    expect(await myToken.symbol()).to.equal("MTK");
  });

  it("Should allow token transfers", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const MyToken = await ethers.getContractFactory("MyToken");
    const myToken = await MyToken.deploy();
    await myToken.waitForDeployment();

    // Transfer 100 tokens to addr1
    await myToken.transfer(addr1.address, ethers.parseEther("100"));

    expect(await myToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
  });
});