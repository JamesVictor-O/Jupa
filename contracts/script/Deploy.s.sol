// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StoreRegistry} from "../src/StoreRegistry.sol";

/// Usage (the key is read from an ignored environment file, never passed on the CLI):
///   REGISTRY_ADMIN=0x... REGISTRY_RELAYER=0x... RELAYER_PRIVATE_KEY=0x... \
///     forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast
contract Deploy is Script {
    error RelayerKeyMismatch();

    function run() external returns (StoreRegistry registry) {
        address usdc = vm.envOr("ARC_USDC_ADDRESS", address(0x3600000000000000000000000000000000000000));
        address admin = vm.envAddress("REGISTRY_ADMIN");
        address registrar = vm.envAddress("REGISTRY_RELAYER");
        uint256 deployerKey = vm.envUint("RELAYER_PRIVATE_KEY");
        if (vm.addr(deployerKey) != registrar) revert RelayerKeyMismatch();

        vm.startBroadcast(deployerKey);
        registry = new StoreRegistry(usdc, admin, registrar);
        vm.stopBroadcast();
        console.log("StoreRegistry:", address(registry));
    }
}
