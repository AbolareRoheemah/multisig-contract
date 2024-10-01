import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("Multisig", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployToken() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const erc20Token = await hre.ethers.getContractFactory("Reemarh");
    const token = await erc20Token.deploy();

    return { token };
  }

  // const oneSigner = ethers.getSigner("0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db") 
  async function deployMultisigFixture() {
    // const tokenAddress = "0xde2c8ee5064C7bf602440b0783F97C74cA4f6C58";
    // const token = await ethers.getContractAt("IERC20", tokenAddress);

    const [owner, otherAccount, otherAcct1, otherAcct2, otherAcct3, otherAcct4, otherAcct5, otherAcct6 ] = await hre.ethers.getSigners();
    const signers = [otherAcct1, otherAcct2, otherAcct3, otherAcct4, otherAcct5, otherAcct6]
    const { token } = await loadFixture(deployToken)

    const Multisig = await hre.ethers.getContractFactory("Multisig");
    const multisig = await Multisig.deploy(2, signers)

    return { multisig, signers, owner, otherAccount, otherAcct1, token };
  }

  describe("Deployment", function () {
    it("Should set the quorum correctly", async function () {
      const { multisig, owner } = await loadFixture(deployMultisigFixture);

      expect(await multisig.quorum()).to.equal(2);
    });

    it("Should set the signers correctly", async function () {
      const { multisig, signers } = await loadFixture(deployMultisigFixture);

      expect(await multisig.noOfValidSigners()).to.equal(signers.length + 1);
    });

    it("Should set the owner as part of signer", async function () {
      const { multisig, signers, owner } = await loadFixture(deployMultisigFixture);

      expect(await multisig.isValidSigner(owner)).to.equal(true);
    });
  });

  describe("Transfer", function () {
    const trsfAmount = ethers.parseUnits("10", 18);
    describe("Validations", function () {
      it("Should revert with the right error if called by non signer address", async function () {
        const { multisig, signers, owner, otherAccount, token } = await loadFixture(deployMultisigFixture);

        await expect(multisig.connect(otherAccount).transfer(trsfAmount, otherAccount, token)).to.be.revertedWith(
          "invalid signer"
        );
      });

      it("Should revert with the right error if recipient is zero address", async function () {
        const { multisig, signers, owner, otherAccount, token } = await loadFixture(deployMultisigFixture);

        await expect(multisig.transfer(trsfAmount, ethers.ZeroAddress, token)).to.be.revertedWith(
          "address zero found"
        );
      });

      it("Should revert with the right error if tokenAddress is zero address", async function () {
        const { multisig, signers, owner, otherAccount, token } = await loadFixture(deployMultisigFixture);

        await expect(multisig.transfer(trsfAmount, otherAccount, ethers.ZeroAddress)).to.be.revertedWith(
          "address zero found"
        );
      });

      it("Should revert with the right error if transfer amount is 0", async function () {
        const { multisig, signers, owner, otherAccount, token } = await loadFixture(deployMultisigFixture);

        await expect(multisig.transfer(0, otherAccount, token)).to.be.revertedWith(
          "can't send zero amount"
        );
      });
      it("Should initiate a transaction and emit an event on transfer", async function () {
        const { multisig, signers, owner, otherAccount, token } = await loadFixture(deployMultisigFixture);

        //  Transfer ERC20 token from owner to contract to pass the insufficient balance check
        const trfAmount = ethers.parseUnits("1000", 18);
        await token.transfer(multisig, trfAmount);
        expect(await token.balanceOf(multisig)).to.equal(trfAmount);

        await expect(multisig.transfer(trsfAmount, otherAccount, token))
          .to.emit(multisig, "TransferInitiated")
          .withArgs(anyValue, anyValue); // We accept any value as `when` arg

        expect(await multisig.txCount()).to.equal(1);
        expect(await multisig.hasSigned(owner, 1)).to.equal(true);
      });
    });
  });

  describe("Approval", function () {
    const trsfAmount = ethers.parseUnits("10", 18);
    it("Should correctly approve a transaction", async function () {
      const { multisig, signers, owner, otherAccount, otherAcct1, token } = await loadFixture(deployMultisigFixture);

      //  Transfer ERC20 token from owner to contract to pass the insufficient balance check
      const trfAmount = ethers.parseUnits("1000", 18);
      await token.transfer(multisig, trfAmount);
      expect(await token.balanceOf(multisig)).to.equal(trfAmount);

      await expect(multisig.transfer(trsfAmount, otherAccount, token))
        .to.emit(multisig, "TransferInitiated")
        .withArgs(anyValue, anyValue); // We accept any value as `when` arg

      expect(await multisig.txCount()).to.equal(1);
      expect( await multisig.hasSigned(owner, 1)).to.equal(true);

      const txStruct = await multisig.getTx(1);
      const caller = await multisig.connect(otherAcct1).approveTx(1)  
      // // const callernot =  

      if (txStruct.isCompleted) {
        expect(caller).to.be.revertedWith("transaction already completed");  
      }
      expect(caller).to.emit(multisig, "ApprovalSuccessful");
      expect(multisig.connect(otherAcct1).approveTx(0)).to.be.revertedWith("invalid tx id");
      expect(multisig.connect(otherAcct1).approveTx(1)).to.be.revertedWith("can't sign twice");
      expect(multisig.connect(otherAccount).approveTx(1)).to.be.revertedWith("not a valid signer");
      expect(await token.balanceOf(otherAccount)).to.equal(trsfAmount);
    });
  });

  describe("Update Quorum", function () {
    const newQuorum = 3;
    describe("Validations", function () {
      it("Should revert with the right error if called by non signer address", async function () {
        const { multisig, signers, owner, otherAccount, token } = await loadFixture(deployMultisigFixture);

        await expect(multisig.connect(otherAccount).updateQuorum(newQuorum)).to.be.revertedWith(
          "invalid signer"
        );
      });
      it("Should initiate a quorum update and emit an event", async function () {
        const { multisig, signers, owner, otherAccount, token } = await loadFixture(deployMultisigFixture);

        await expect(multisig.updateQuorum(newQuorum))
          .to.emit(multisig, "QuorumUpdateInitiated"); // We accept any value as `when` arg

        expect(await multisig.txCount()).to.equal(1);
        expect(await multisig.hasSigned(owner, 1)).to.equal(true);
        expect(await multisig.pendingQuorum()).to.equal(newQuorum);
      });
    });
  });

  describe("Quorum Approval", function () {
    const newQuorum = 3;
    it("Should correctly approve a quorum update", async function () {
      const { multisig, signers, owner, otherAccount, otherAcct1, token } = await loadFixture(deployMultisigFixture);

      await expect(multisig.updateQuorum(newQuorum))
        .to.emit(multisig, "QuorumUpdateInitiated");

      expect(await multisig.txCount()).to.equal(1);
      expect(await multisig.hasSigned(owner, 1)).to.equal(true);
      expect(await multisig.pendingQuorum()).to.equal(newQuorum);

      const txStruct = await multisig.getTx(1);
      const caller = await multisig.connect(otherAcct1).approveUpdateQuorum(1);
      // // const callernot =  

      if (txStruct.isCompleted) {
        expect(caller).to.be.revertedWith("transaction already completed");  
      }
      expect(caller).to.emit(multisig, "QuorumUpdateSuccessful");
      expect(caller).to.be.revertedWith("invalid tx id");
      expect(caller).to.be.revertedWith("can't sign twice");
      expect(caller).to.be.revertedWith("not a valid signer");
      expect(await multisig.quorum()).to.equal(newQuorum);
    });
  });
});
