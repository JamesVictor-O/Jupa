// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StoreRegistry} from "../src/StoreRegistry.sol";

/// Usage (Foundry prompts for the encrypted keystore password):
///   REGISTRY_ADMIN=0x... REGISTRY_RELAYER=0x... \
///     forge script script/Deploy.s.sol --rpc-url arc_mainnet --account jupa-deployer --broadcast
contract Deploy is Script {
    function run() external returns (StoreRegistry registry) {
        address usdc = vm.envOr("ARC_USDC_ADDRESS", address(0x3600000000000000000000000000000000000000));
        address admin = vm.envAddress("REGISTRY_ADMIN");
        address registrar = vm.envAddress("REGISTRY_RELAYER");

        vm.startBroadcast();
        registry = new StoreRegistry(usdc, admin, registrar);
        vm.stopBroadcast();
        console.log("StoreRegistry:", address(registry));
    }
}
