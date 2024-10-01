import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MyTokenModule = buildModule("ReemarhModule", (m) => {

    const erc20 = m.contract("Reemarh");

    return { erc20 };
});

export default MyTokenModule;
