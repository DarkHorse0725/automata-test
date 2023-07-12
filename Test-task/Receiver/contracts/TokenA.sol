// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract TokenA is ERC20Permit {
    constructor(string memory name, string memory symbol) ERC20Permit(name) ERC20(name, symbol) {
        _mint(msg.sender, 100000000 * 10 ** 18);
    }
}