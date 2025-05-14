// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

/**
 * @title MyTokenName Token
 * @dev Implementation of the MyTokenName Token
 * @custom:dev-run-script contracts/MyToken.sol
 */
contract MyToken is ERC20 {
    /**
     * @dev Constructor that gives the msg.sender all of the initial supply.
     */
    constructor() ERC20("MyTokenName", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}