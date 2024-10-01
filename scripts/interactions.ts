import { ethers } from "hardhat";

async function main() {

    const multisigTokenAddress = "0x170Bbd5A102B995517B133aa6b9275d103B9a120";
    // const multisigToken = await ethers.getContractAt("IERC20", multisigTokenAddress);

    const MultisigContractAddy = '0xf01F5c67134648Cd21b8FB180eF216C1C7F66965'
    const multisig = await ethers.getContractAt("IMultisig", MultisigContractAddy)

    console.log("contract addy", multisig);

    // initiate transaction
    const txAmount = ethers.parseUnits("100", 18);
    const recipientAddy = '0x5c6B0f7Bf3E7ce046039Bd8FABdfD3f9F5021678'

    const xferTx = await multisig.transfer(txAmount, recipientAddy, multisigTokenAddress)

    console.log("transfer was called:", xferTx)

    xferTx.wait()

    const count = await multisig.getCount();
    console.log('count', count)

    // approve transaction
    const approveTx = await multisig.approveTx(1);

    console.log("approve called", approveTx);

    approveTx.wait();
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});