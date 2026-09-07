// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AuditFirewallConsumer
 * @notice Stores CRE Confidential Workflow audit verdicts on-chain (Continuity state change).
 * @dev Production CRE writeReport path should use Keystone Forwarder + ReceiverTemplate.
 *      This consumer also allows an authorized reporter (deployer / proxy wallet) to
 *      recordVerdict for staging demos and IDE-driven settlement before full DON write is wired.
 */
contract AuditFirewallConsumer {
    /// @dev 1 = ALLOW, 2 = DENY, 3 = MANUAL_REVIEW
    uint8 public latestVerdictCode;
    uint8 public latestRiskMask;
    bytes32 public latestSourceHash;
    uint64 public latestChainSelector;
    uint256 public latestRecordedAt;
    address public owner;
    address public authorizedReporter;

    event VerdictReceived(
        uint8 verdictCode,
        uint8 riskMask,
        bytes32 indexed sourceHash,
        uint64 chainSelector,
        address indexed reporter
    );
    event AuthorizedReporterUpdated(address indexed previous, address indexed next);
    event OwnershipTransferred(address indexed previous, address indexed next);

    error NotAuthorized();
    error InvalidVerdict();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlyReporter() {
        if (msg.sender != owner && msg.sender != authorizedReporter) revert NotAuthorized();
        _;
    }

    constructor(address reporter) {
        owner = msg.sender;
        authorizedReporter = reporter == address(0) ? msg.sender : reporter;
        emit OwnershipTransferred(address(0), msg.sender);
        emit AuthorizedReporterUpdated(address(0), authorizedReporter);
    }

    function setAuthorizedReporter(address reporter) external onlyOwner {
        address prev = authorizedReporter;
        authorizedReporter = reporter;
        emit AuthorizedReporterUpdated(prev, reporter);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero");
        address prev = owner;
        owner = newOwner;
        emit OwnershipTransferred(prev, newOwner);
    }

    /**
     * @notice Record a confidential-workflow verdict (state change).
     * @param verdictCode 1 ALLOW / 2 DENY / 3 MANUAL_REVIEW
     * @param riskMask bit0 obfuscatedTax, bit1 privilegeEscalation, bit2 externalCallRisk, bit3 logicBomb
     * @param sourceHash SHA-256 of audited source (bytes32)
     * @param chainSelector CRE chain selector (0 if unused)
     */
    function recordVerdict(
        uint8 verdictCode,
        uint8 riskMask,
        bytes32 sourceHash,
        uint64 chainSelector
    ) external onlyReporter {
        if (verdictCode < 1 || verdictCode > 3) revert InvalidVerdict();
        latestVerdictCode = verdictCode;
        latestRiskMask = riskMask;
        latestSourceHash = sourceHash;
        latestChainSelector = chainSelector;
        latestRecordedAt = block.timestamp;
        emit VerdictReceived(verdictCode, riskMask, sourceHash, chainSelector, msg.sender);
    }

    /**
     * @notice CRE Keystone-style report entry (abi-encoded payload).
     * @dev metadata unused in v1; report = abi.encode(uint8,uint8,bytes32,uint64)
     */
    function onReport(bytes calldata /* metadata */, bytes calldata report) external onlyReporter {
        (uint8 verdictCode, uint8 riskMask, bytes32 sourceHash, uint64 chainSelector) = abi.decode(
            report,
            (uint8, uint8, bytes32, uint64)
        );
        if (verdictCode < 1 || verdictCode > 3) revert InvalidVerdict();
        latestVerdictCode = verdictCode;
        latestRiskMask = riskMask;
        latestSourceHash = sourceHash;
        latestChainSelector = chainSelector;
        latestRecordedAt = block.timestamp;
        emit VerdictReceived(verdictCode, riskMask, sourceHash, chainSelector, msg.sender);
    }
}
