// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CrosschainPaymentFactory} from "../src/CrosschainPaymentFactory.sol";
import {StoreRegistry} from "../src/StoreRegistry.sol";

/// @notice Deploys the complete Jupa settlement system with mainnet-only safety checks.
/// @dev Use an encrypted Foundry keystore via `--account`; never pass a raw key.
contract DeployMainnet is Script {
    address internal constant ARC_USDC = 0x3600000000000000000000000000000000000000;
    uint256 internal constant ARC_MAINNET_CHAIN_ID = 5042;

    error WrongChain(uint256 actual);
    error SameAdminAndRelayer();
    error InvalidUsdc();

    function run() external returns (StoreRegistry registry, CrosschainPaymentFactory factory) {
        if (block.chainid != ARC_MAINNET_CHAIN_ID) revert WrongChain(block.chainid);
        if (ARC_USDC.code.length == 0) revert InvalidUsdc();

        address admin = vm.envAddress("REGISTRY_ADMIN");
        address registrar = vm.envAddress("REGISTRY_RELAYER");
        if (admin == registrar) revert SameAdminAndRelayer();

        vm.startBroadcast();
        registry = new StoreRegistry(ARC_USDC, admin, registrar);
        factory = new CrosschainPaymentFactory(ARC_USDC, address(registry));
        vm.stopBroadcast();

        console.log("StoreRegistry:", address(registry));
        console.log("CrosschainPaymentFactory:", address(factory));
    }
}
