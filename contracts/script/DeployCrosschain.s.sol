// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CrosschainPaymentFactory} from "../src/CrosschainPaymentFactory.sol";

contract DeployCrosschain is Script {
    function run() external returns (CrosschainPaymentFactory factory) {
        address usdc = vm.envOr("ARC_USDC_ADDRESS", address(0x3600000000000000000000000000000000000000));
        address registry = vm.envAddress("STORE_REGISTRY_ADDRESS");

        vm.startBroadcast();
        factory = new CrosschainPaymentFactory(usdc, registry);
        vm.stopBroadcast();
        console.log("CrosschainPaymentFactory:", address(factory));
    }
}
