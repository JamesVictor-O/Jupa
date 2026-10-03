// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StoreRegistry} from "../src/StoreRegistry.sol";

/// Usage (keystore account, never a raw key on the CLI):
///   cast wallet import jupa-deployer --interactive
///   forge script script/Deploy.s.sol --rpc-url arc_testnet --account jupa-deployer --broadcast
contract Deploy is Script {
    function run() external returns (StoreRegistry registry) {
        address usdc = vm.envOr("ARC_USDC_ADDRESS", address(0x3600000000000000000000000000000000000000));
        vm.startBroadcast();
        registry = new StoreRegistry(usdc);
        vm.stopBroadcast();
        console.log("StoreRegistry:", address(registry));
    }
}
