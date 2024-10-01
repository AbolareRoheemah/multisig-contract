import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MultisigModule = buildModule("MultisigModule", (m) => {
  const quorum = 2;
  const signers = ['0x5B38Da6a701c568545dCfcB03FcB875f56beddC4', '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2', '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db','0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db', '0x617F2E2fD72FD9D5503197092aC168c91465E7f2'];

  const multisig = m.contract("Multisig", [quorum, signers]);

  return { multisig };
});

export default MultisigModule;
