// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title Jupa StoreRegistry
/// @notice Onchain source of truth for where each store gets paid. Jupa's servers and
///         the checkout page read the payout address from here, never from the browser.
/// @dev Non-custodial: `pay` moves USDC straight from the payer to the store's payout
///      address. This contract never holds funds.
contract StoreRegistry {
    struct Store {
        address owner;
        address payout;
    }

    /// @notice USDC ERC-20 on Arc (6 decimals).
    IERC20 public immutable usdc;

    mapping(bytes32 storeId => Store) public stores;

    event StoreRegistered(bytes32 indexed storeId, address indexed owner, address payout);
    event PayoutUpdated(bytes32 indexed storeId, address payout);
    event OwnershipTransferred(bytes32 indexed storeId, address indexed newOwner);
    /// @notice Emitted for direct Arc payments; `chargeRef` lets the indexer match the charge.
    event ChargePaid(
        bytes32 indexed storeId, bytes32 indexed chargeRef, address indexed payer, address payout, uint256 amount
    );

    error StoreExists();
    error UnknownStore();
    error NotOwner();
    error ZeroAddress();
    error ZeroAmount();
    error TransferFailed();

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
    }

    /// @notice Register a store. Callable by anyone (e.g. a gas-sponsoring relayer);
    ///         only `owner` can change the payout afterwards.
    function register(bytes32 storeId, address owner, address payout) external {
        if (owner == address(0) || payout == address(0)) revert ZeroAddress();
        if (stores[storeId].owner != address(0)) revert StoreExists();
        stores[storeId] = Store(owner, payout);
        emit StoreRegistered(storeId, owner, payout);
    }

    function setPayout(bytes32 storeId, address payout) external onlyOwner(storeId) {
        if (payout == address(0)) revert ZeroAddress();
        stores[storeId].payout = payout;
        emit PayoutUpdated(storeId, payout);
    }

    function transferOwnership(bytes32 storeId, address newOwner) external onlyOwner(storeId) {
        if (newOwner == address(0)) revert ZeroAddress();
        stores[storeId].owner = newOwner;
        emit OwnershipTransferred(storeId, newOwner);
    }

    function payoutOf(bytes32 storeId) public view returns (address payout) {
        payout = stores[storeId].payout;
        if (payout == address(0)) revert UnknownStore();
    }

    /// @notice Pay a charge with USDC already on Arc. Requires prior USDC approval.
    /// @param amount USDC amount in 6-decimal units.
    function pay(bytes32 storeId, bytes32 chargeRef, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        address payout = payoutOf(storeId);
        if (!usdc.transferFrom(msg.sender, payout, amount)) revert TransferFailed();
        emit ChargePaid(storeId, chargeRef, msg.sender, payout, amount);
    }

    modifier onlyOwner(bytes32 storeId) {
        if (stores[storeId].owner != msg.sender) revert NotOwner();
        _;
    }
}
