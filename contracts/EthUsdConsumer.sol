// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

/**
 * @title EthUsdConsumer
 * @notice Continuity Price Feeds (A): settle Chainlink ETH/USD into onchain storage.
 * @dev Sepolia ETH/USD proxy: 0x694AA1769357215DE4FAC081bf1f309aDC325306
 *      Anyone may call settleLatestPrice() for the hackathon demo state change.
 */
contract EthUsdConsumer {
    AggregatorV3Interface public immutable feed;

    uint80 public settledRoundId;
    int256 public settledAnswer;
    uint256 public settledUpdatedAt;
    uint256 public settledAt;
    address public settledBy;

    event PriceSettled(
        uint80 indexed roundId,
        int256 answer,
        uint256 updatedAt,
        address indexed settler
    );

    error InvalidFeed();
    error InvalidAnswer();
    error StaleRound();

    constructor(address feedAddress) {
        if (feedAddress == address(0)) revert InvalidFeed();
        feed = AggregatorV3Interface(feedAddress);
    }

    function decimals() external view returns (uint8) {
        return feed.decimals();
    }

    /// @notice Live answer from the Chainlink aggregator (no state change).
    /// @dev Same staleness / validity checks as settleLatestPrice.
    function getLivePrice()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 updatedAt)
    {
        (
            uint80 rid,
            int256 ans,
            ,
            uint256 upd,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        if (ans <= 0) revert InvalidAnswer();
        if (answeredInRound < rid) revert StaleRound();

        return (rid, ans, upd);
    }

    /// @notice Last settled snapshot written by settleLatestPrice.
    function latestSettled()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 updatedAt,
            uint256 settledTimestamp,
            address settler
        )
    {
        return (settledRoundId, settledAnswer, settledUpdatedAt, settledAt, settledBy);
    }

    /**
     * @notice Read AggregatorV3 latestRoundData and persist it (Continuity state change).
     */
    function settleLatestPrice() external returns (uint80 roundId, int256 answer, uint256 updatedAt) {
        (
            uint80 rid,
            int256 ans,
            ,
            uint256 upd,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        if (ans <= 0) revert InvalidAnswer();
        if (answeredInRound < rid) revert StaleRound();

        settledRoundId = rid;
        settledAnswer = ans;
        settledUpdatedAt = upd;
        settledAt = block.timestamp;
        settledBy = msg.sender;

        emit PriceSettled(rid, ans, upd, msg.sender);
        return (rid, ans, upd);
    }
}
