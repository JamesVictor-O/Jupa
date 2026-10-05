// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IArcUSDC {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IStorePayoutRegistry {
    function payoutOf(bytes32 storeId) external view returns (address);
}

/// @dev One deterministic receiver exists for each store/charge pair. Its constructor
/// forwards the USDC already minted to its counterfactual address to the registry's
/// current payout address. It never accepts an arbitrary destination.
contract CrosschainPaymentReceiver {
    error ZeroBalance();
    error TransferFailed();

    constructor(IArcUSDC usdc, IStorePayoutRegistry registry, bytes32 storeId) {
        uint256 amount = usdc.balanceOf(address(this));
        if (amount == 0) revert ZeroBalance();
        if (!usdc.transfer(registry.payoutOf(storeId), amount)) revert TransferFailed();
    }
}

/// @title Jupa CrosschainPaymentFactory
/// @notice Produces single-use counterfactual Arc receivers for CCTP payments.
contract CrosschainPaymentFactory {
    IArcUSDC public immutable usdc;
    IStorePayoutRegistry public immutable registry;

    event CrosschainChargePaid(
        bytes32 indexed storeId, bytes32 indexed chargeRef, address indexed receiver, address payout, uint256 amount
    );

    error ZeroAddress();
    error InvalidContract();
    error ZeroStoreId();
    error ZeroChargeRef();

    constructor(address usdc_, address registry_) {
        if (usdc_ == address(0) || registry_ == address(0)) revert ZeroAddress();
        if (usdc_.code.length == 0 || registry_.code.length == 0) revert InvalidContract();
        usdc = IArcUSDC(usdc_);
        registry = IStorePayoutRegistry(registry_);
    }

    function receiverOf(bytes32 storeId, bytes32 chargeRef) public view returns (address) {
        if (storeId == bytes32(0)) revert ZeroStoreId();
        if (chargeRef == bytes32(0)) revert ZeroChargeRef();
        bytes32 salt = keccak256(abi.encode(storeId, chargeRef));
        bytes32 initCodeHash = keccak256(
            abi.encodePacked(type(CrosschainPaymentReceiver).creationCode, abi.encode(usdc, registry, storeId))
        );
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash)))));
    }

    /// @notice Forward a completed CCTP mint to the merchant and emit its charge reference.
    /// @dev Permissionless and safe: destination comes only from StoreRegistry.
    function settle(bytes32 storeId, bytes32 chargeRef) external returns (address receiver, uint256 amount) {
        receiver = receiverOf(storeId, chargeRef);
        amount = usdc.balanceOf(receiver);
        address payout = registry.payoutOf(storeId);
        bytes32 salt = keccak256(abi.encode(storeId, chargeRef));
        CrosschainPaymentReceiver deployed = new CrosschainPaymentReceiver{salt: salt}(usdc, registry, storeId);
        assert(address(deployed) == receiver);
        emit CrosschainChargePaid(storeId, chargeRef, receiver, payout, amount);
    }
}
