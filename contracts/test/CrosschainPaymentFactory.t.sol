// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CrosschainPaymentFactory, CrosschainPaymentReceiver} from "../src/CrosschainPaymentFactory.sol";
import {StoreRegistry} from "../src/StoreRegistry.sol";

contract ReceiverMockUSDC {
    mapping(address => uint256) public balanceOf;
    bool public failTransfers;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function setFailTransfers(bool value) external {
        failTransfers = value;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (failTransfers) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return true;
    }
}

contract CrosschainPaymentFactoryTest is Test {
    ReceiverMockUSDC usdc;
    StoreRegistry registry;
    CrosschainPaymentFactory factory;

    bytes32 constant STORE = keccak256("store-1");
    bytes32 constant CHARGE = keccak256("charge-1");
    address payout = makeAddr("payout");

    function setUp() public {
        usdc = new ReceiverMockUSDC();
        registry = new StoreRegistry(address(usdc), address(this), address(this));
        registry.register(STORE, address(this), payout);
        factory = new CrosschainPaymentFactory(address(usdc), address(registry));
    }

    function test_counterfactualReceiverForwardsEntireBalance() public {
        address predicted = factory.receiverOf(STORE, CHARGE);
        usdc.mint(predicted, 12_340_000);

        vm.expectEmit(address(factory));
        emit CrosschainPaymentFactory.CrosschainChargePaid(STORE, CHARGE, predicted, payout, 12_340_000);
        (address receiver, uint256 amount) = factory.settle(STORE, CHARGE);

        assertEq(receiver, predicted);
        assertEq(amount, 12_340_000);
        assertEq(usdc.balanceOf(payout), 12_340_000);
        assertEq(usdc.balanceOf(receiver), 0);
        assertGt(receiver.code.length, 0);
    }

    function test_settlementUsesLatestRegistryPayout() public {
        address predicted = factory.receiverOf(STORE, CHARGE);
        address nextPayout = makeAddr("next-payout");
        registry.setPayout(STORE, nextPayout);
        usdc.mint(predicted, 1e6);
        factory.settle(STORE, CHARGE);
        assertEq(usdc.balanceOf(nextPayout), 1e6);
    }

    function test_cannotSettleBeforeFundsArrive() public {
        vm.expectRevert(CrosschainPaymentReceiver.ZeroBalance.selector);
        factory.settle(STORE, CHARGE);
        assertEq(factory.receiverOf(STORE, CHARGE).code.length, 0);
    }

    function test_chargeReceiverCanOnlyDeployOnce() public {
        address predicted = factory.receiverOf(STORE, CHARGE);
        usdc.mint(predicted, 1e6);
        factory.settle(STORE, CHARGE);
        vm.expectRevert();
        factory.settle(STORE, CHARGE);
    }

    function test_failedTransferDoesNotDeployReceiver() public {
        address predicted = factory.receiverOf(STORE, CHARGE);
        usdc.mint(predicted, 1e6);
        usdc.setFailTransfers(true);
        vm.expectRevert(CrosschainPaymentReceiver.TransferFailed.selector);
        factory.settle(STORE, CHARGE);
        assertEq(predicted.code.length, 0);
        assertEq(usdc.balanceOf(predicted), 1e6);
    }

    function test_rejectsInvalidInputs() public {
        vm.expectRevert(CrosschainPaymentFactory.ZeroStoreId.selector);
        factory.receiverOf(bytes32(0), CHARGE);
        vm.expectRevert(CrosschainPaymentFactory.ZeroChargeRef.selector);
        factory.receiverOf(STORE, bytes32(0));
    }
}
