// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 private _value;

    event ValueChanged(address indexed setter, uint256 newValue);

    constructor() {
        _value = 42;
    }

    function setValue(uint256 _newValue) public {
        _value = _newValue;
        emit ValueChanged(msg.sender, _newValue);
    }

    function getValue() public view returns (uint256) {
        return _value;
    }
}
