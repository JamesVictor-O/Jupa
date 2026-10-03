// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StoreRegistry} from "../src/StoreRegistry.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
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
    address owner = makeAddr("owner");
    address payout = makeAddr("payout");
    address customer = makeAddr("customer");

    function setUp() public {
        usdc = new MockUSDC();
        registry = new StoreRegistry(address(usdc));
        registry.register(STORE, owner, payout);
    }

    function test_register() public view {
        assertEq(registry.payoutOf(STORE), payout);
    }

    function test_registerTwiceReverts() public {
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

    function test_payGoesStraightToPayout() public {
        usdc.mint(customer, 5e6);
        vm.startPrank(customer);
        usdc.approve(address(registry), 5e6);
        vm.expectEmit(address(registry));
        emit StoreRegistry.ChargePaid(STORE, CHARGE, customer, payout, 5e6);
        registry.pay(STORE, CHARGE, 5e6);
        vm.stopPrank();

        assertEq(usdc.balanceOf(payout), 5e6);
        assertEq(usdc.balanceOf(address(registry)), 0);
    }

    function test_payUnknownStoreReverts() public {
        vm.expectRevert(StoreRegistry.UnknownStore.selector);
        registry.pay(keccak256("nope"), CHARGE, 1e6);
    }
}
