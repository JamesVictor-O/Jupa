// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StoreRegistry} from "../src/StoreRegistry.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    bool public failTransfers;

    function setFailTransfers(bool value) external {
        failTransfers = value;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (failTransfers) return false;
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract StoreRegistryTest is Test {
    StoreRegistry registry;
    MockUSDC usdc;

    bytes32 constant STORE = keccak256("store-1");
    bytes32 constant CHARGE = keccak256("charge-1");
    address admin = makeAddr("admin");
    address registrar = makeAddr("registrar");
    address owner = makeAddr("owner");
    address payout = makeAddr("payout");
    address customer = makeAddr("customer");

    function setUp() public {
        usdc = new MockUSDC();
        registry = new StoreRegistry(address(usdc), admin, registrar);
        vm.prank(registrar);
        registry.register(STORE, owner, payout);
    }

    function test_constructorRejectsInvalidAddresses() public {
        vm.expectRevert(StoreRegistry.ZeroAddress.selector);
        new StoreRegistry(address(0), admin, registrar);
        vm.expectRevert(StoreRegistry.ZeroAddress.selector);
        new StoreRegistry(address(usdc), address(0), registrar);
        vm.expectRevert(StoreRegistry.ZeroAddress.selector);
        new StoreRegistry(address(usdc), admin, address(0));
        vm.expectRevert(StoreRegistry.InvalidContract.selector);
        new StoreRegistry(makeAddr("not-a-contract"), admin, registrar);
    }

    function test_adminFunctionsRejectUnauthorizedAndZeroAddresses() public {
        vm.expectRevert(StoreRegistry.NotAdmin.selector);
        registry.setRegistrar(makeAddr("next-registrar"), true);
        vm.expectRevert(StoreRegistry.NotAdmin.selector);
        registry.transferAdmin(makeAddr("next-admin"));

        vm.startPrank(admin);
        vm.expectRevert(StoreRegistry.ZeroAddress.selector);
        registry.setRegistrar(address(0), true);
        vm.expectRevert(StoreRegistry.ZeroAddress.selector);
        registry.transferAdmin(address(0));
        vm.stopPrank();
    }

    function test_onlyRegistrarCanRegister() public {
        vm.expectRevert(StoreRegistry.NotRegistrar.selector);
        registry.register(keccak256("attacker-store"), owner, payout);
    }

    function test_adminCanRotateRegistrar() public {
        address next = makeAddr("next-registrar");
        vm.prank(admin);
        registry.setRegistrar(next, true);
        vm.prank(next);
        registry.register(keccak256("store-2"), owner, payout);

        vm.prank(admin);
        registry.setRegistrar(registrar, false);
        vm.prank(registrar);
        vm.expectRevert(StoreRegistry.NotRegistrar.selector);
        registry.register(keccak256("store-3"), owner, payout);
    }

    function test_adminTransferIsTwoStep() public {
        address next = makeAddr("next-admin");
        vm.prank(admin);
        registry.transferAdmin(next);
        vm.expectRevert(StoreRegistry.NotPendingAdmin.selector);
        registry.acceptAdmin();
        vm.prank(next);
        registry.acceptAdmin();
        assertEq(registry.admin(), next);
        assertEq(registry.pendingAdmin(), address(0));
    }

    function test_registerRejectsZeroStoreId() public {
        vm.prank(registrar);
        vm.expectRevert(StoreRegistry.ZeroStoreId.selector);
        registry.register(bytes32(0), owner, payout);
    }

    function test_registerRejectsZeroOwnerAndPayout() public {
        vm.startPrank(registrar);
        vm.expectRevert(StoreRegistry.ZeroAddress.selector);
        registry.register(keccak256("zero-owner"), address(0), payout);
        vm.expectRevert(StoreRegistry.ZeroAddress.selector);
        registry.register(keccak256("zero-payout"), owner, address(0));
        vm.stopPrank();
    }

    function test_registerTwiceReverts() public {
        vm.prank(registrar);
        vm.expectRevert(StoreRegistry.StoreExists.selector);
        registry.register(STORE, owner, payout);
    }

    function test_onlyOwnerSetsPayout() public {
        address next = makeAddr("next");
        vm.expectRevert(StoreRegistry.NotOwner.selector);
        registry.setPayout(STORE, next);

        vm.prank(owner);
        registry.setPayout(STORE, next);
        assertEq(registry.payoutOf(STORE), next);
    }

    function test_unknownStoreOwnerActionUsesSpecificError() public {
        vm.expectRevert(StoreRegistry.UnknownStore.selector);
        registry.setPayout(keccak256("missing"), payout);
    }

    function test_storeOwnershipTransferIsTwoStep() public {
        address next = makeAddr("next-owner");
        vm.prank(owner);
        registry.transferOwnership(STORE, next);
        vm.expectRevert(StoreRegistry.NotPendingOwner.selector);
        registry.acceptOwnership(STORE);
        vm.prank(next);
        registry.acceptOwnership(STORE);

        (address currentOwner,) = registry.stores(STORE);
        assertEq(currentOwner, next);
        assertEq(registry.pendingStoreOwners(STORE), address(0));
    }

    function test_storeOwnershipRejectsInvalidTransfers() public {
        vm.prank(owner);
        vm.expectRevert(StoreRegistry.ZeroAddress.selector);
        registry.transferOwnership(STORE, address(0));

        vm.expectRevert(StoreRegistry.NotOwner.selector);
        registry.transferOwnership(STORE, makeAddr("next-owner"));
        vm.expectRevert(StoreRegistry.UnknownStore.selector);
        registry.acceptOwnership(keccak256("missing-store"));
    }

    function testFuzz_payGoesStraightToPayout(uint96 rawAmount) public {
        uint256 amount = bound(uint256(rawAmount), 1, type(uint96).max);
        usdc.mint(customer, amount);
        vm.startPrank(customer);
        usdc.approve(address(registry), amount);
        vm.expectEmit(address(registry));
        emit StoreRegistry.ChargePaid(STORE, CHARGE, customer, payout, amount);
        registry.pay(STORE, CHARGE, amount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(payout), amount);
        assertEq(usdc.balanceOf(address(registry)), 0);
        assertTrue(registry.paidCharges(STORE, CHARGE));
    }

    function test_duplicateChargeReverts() public {
        usdc.mint(customer, 2e6);
        vm.startPrank(customer);
        usdc.approve(address(registry), 2e6);
        registry.pay(STORE, CHARGE, 1e6);
        vm.expectRevert(StoreRegistry.ChargeAlreadyPaid.selector);
        registry.pay(STORE, CHARGE, 1e6);
        vm.stopPrank();
    }

    function test_failedTransferDoesNotConsumeCharge() public {
        usdc.setFailTransfers(true);
        vm.prank(customer);
        vm.expectRevert(StoreRegistry.TransferFailed.selector);
        registry.pay(STORE, CHARGE, 1e6);
        assertFalse(registry.paidCharges(STORE, CHARGE));
    }

    function test_payRejectsInvalidInput() public {
        vm.expectRevert(StoreRegistry.ZeroChargeRef.selector);
        registry.pay(STORE, bytes32(0), 1e6);
        vm.expectRevert(StoreRegistry.ZeroAmount.selector);
        registry.pay(STORE, CHARGE, 0);
        vm.expectRevert(StoreRegistry.UnknownStore.selector);
        registry.pay(keccak256("nope"), CHARGE, 1e6);
    }
}
