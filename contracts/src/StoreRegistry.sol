// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title Jupa StoreRegistry
/// @notice Onchain source of truth for store payout addresses and direct Arc USDC payments.
/// @dev The contract is non-custodial: funds move directly from payer to store payout.
contract StoreRegistry {
    struct Store {
        address owner;
        address payout;
    }

    /// @notice USDC ERC-20 on Arc (6-decimal token view).
    IERC20 public immutable usdc;
    address public admin;
    address public pendingAdmin;

    mapping(address registrar => bool allowed) public registrars;
    mapping(bytes32 storeId => Store) public stores;
    mapping(bytes32 storeId => address pendingOwner) public pendingStoreOwners;
    mapping(bytes32 storeId => mapping(bytes32 chargeRef => bool paid)) public paidCharges;

    event RegistrarUpdated(address indexed registrar, bool allowed);
    event AdminTransferStarted(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    event StoreRegistered(bytes32 indexed storeId, address indexed owner, address payout);
    event PayoutUpdated(bytes32 indexed storeId, address payout);
    event StoreOwnershipTransferStarted(bytes32 indexed storeId, address indexed owner, address indexed pendingOwner);
    event StoreOwnershipTransferred(bytes32 indexed storeId, address indexed previousOwner, address indexed newOwner);
    event ChargePaid(
        bytes32 indexed storeId, bytes32 indexed chargeRef, address indexed payer, address payout, uint256 amount
    );

    error StoreExists();
    error UnknownStore();
    error NotAdmin();
    error NotRegistrar();
    error NotOwner();
    error NotPendingAdmin();
    error NotPendingOwner();
    error ZeroAddress();
    error InvalidContract();
    error ZeroStoreId();
    error ZeroChargeRef();
    error ZeroAmount();
    error ChargeAlreadyPaid();
    error TransferFailed();

    constructor(address usdc_, address admin_, address registrar_) {
        if (usdc_ == address(0) || admin_ == address(0) || registrar_ == address(0)) revert ZeroAddress();
        if (usdc_.code.length == 0) revert InvalidContract();
        usdc = IERC20(usdc_);
        admin = admin_;
        registrars[registrar_] = true;
        emit RegistrarUpdated(registrar_, true);
        emit AdminTransferred(address(0), admin_);
    }

    /// @notice Allow or revoke a backend relayer. Existing stores cannot be changed by registrars.
    function setRegistrar(address registrar, bool allowed) external onlyAdmin {
        if (registrar == address(0)) revert ZeroAddress();
        registrars[registrar] = allowed;
        emit RegistrarUpdated(registrar, allowed);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(admin, newAdmin);
    }

    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        address previous = admin;
        admin = msg.sender;
        pendingAdmin = address(0);
        emit AdminTransferred(previous, msg.sender);
    }

    /// @notice Register a store through an approved Jupa relayer.
    /// @dev Only the store owner can modify the payout or ownership after registration.
    function register(bytes32 storeId, address owner, address payout) external onlyRegistrar {
        if (storeId == bytes32(0)) revert ZeroStoreId();
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
        pendingStoreOwners[storeId] = newOwner;
        emit StoreOwnershipTransferStarted(storeId, msg.sender, newOwner);
    }

    function acceptOwnership(bytes32 storeId) external {
        if (stores[storeId].owner == address(0)) revert UnknownStore();
        if (pendingStoreOwners[storeId] != msg.sender) revert NotPendingOwner();
        address previous = stores[storeId].owner;
        stores[storeId].owner = msg.sender;
        delete pendingStoreOwners[storeId];
        emit StoreOwnershipTransferred(storeId, previous, msg.sender);
    }

    function payoutOf(bytes32 storeId) public view returns (address payout) {
        payout = stores[storeId].payout;
        if (payout == address(0)) revert UnknownStore();
    }

    /// @notice Pay a single-use charge with Arc USDC. Requires prior USDC approval.
    /// @param amount USDC amount in 6-decimal token units.
    function pay(bytes32 storeId, bytes32 chargeRef, uint256 amount) external {
        if (chargeRef == bytes32(0)) revert ZeroChargeRef();
        if (amount == 0) revert ZeroAmount();
        address payout = payoutOf(storeId);
        if (paidCharges[storeId][chargeRef]) revert ChargeAlreadyPaid();

        // Checks-effects-interactions: a malicious token cannot re-enter the same charge.
        // A failed transfer reverts this write atomically.
        paidCharges[storeId][chargeRef] = true;
        if (!usdc.transferFrom(msg.sender, payout, amount)) revert TransferFailed();
        emit ChargePaid(storeId, chargeRef, msg.sender, payout, amount);
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyRegistrar() {
        if (!registrars[msg.sender]) revert NotRegistrar();
        _;
    }

    modifier onlyOwner(bytes32 storeId) {
        address owner = stores[storeId].owner;
        if (owner == address(0)) revert UnknownStore();
        if (owner != msg.sender) revert NotOwner();
        _;
    }
}
