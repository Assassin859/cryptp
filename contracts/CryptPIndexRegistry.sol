// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CryptPIndexRegistry
 * @notice Opt-in registry so CryptP's platform subgraph can index user contracts.
 * @dev Emit ContractRegistered → subgraph creates a data-source template for known kinds.
 */
contract CryptPIndexRegistry {
    bytes32 public constant KIND_SIMPLE_STORAGE = keccak256("SimpleStorage");

    event ContractRegistered(
        address indexed contractAddress,
        address indexed registrant,
        bytes32 indexed kind
    );

    mapping(address => bytes32) public registeredKind;
    mapping(address => address) public registrantOf;

    error ZeroAddress();
    error AlreadyRegistered();

    /**
     * @notice Register a deployed contract for indexing.
     * @param contractAddress Address of the user contract on this chain.
     * @param kind Template kind (use KIND_SIMPLE_STORAGE for SimpleStorage ABI).
     */
    function register(address contractAddress, bytes32 kind) external {
        if (contractAddress == address(0)) revert ZeroAddress();
        if (registeredKind[contractAddress] != bytes32(0)) revert AlreadyRegistered();

        registeredKind[contractAddress] = kind;
        registrantOf[contractAddress] = msg.sender;

        emit ContractRegistered(contractAddress, msg.sender, kind);
    }
}
