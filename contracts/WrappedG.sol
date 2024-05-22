// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

import { IWETH9Like } from "./interfaces/IWETH9Like.sol";

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title Wrapped G Token (ERC20) Contract
/// @author Galxe Team
/// @dev Wrapped G token is an ERC20 token that wraps the native G token. It is compatible with WETH9.
/// @custom:security-contact security@galxe.com
contract WrappedG is ERC20, ERC20Permit, IWETH9Like {
    error FAIL_TRANSFER();

    constructor() ERC20("Wrapped G", "wG") ERC20Permit("Wrapped G") {}

    function deposit() external payable override {
        depositTo(msg.sender);
    }

    function withdraw(uint256 amount) external override {
        withdrawTo(msg.sender, amount);
    }

    function depositTo(address account) public payable {
        _mint(account, msg.value);
    }

    function withdrawTo(address account, uint256 amount) public {
        _burn(msg.sender, amount);
        (bool success, ) = account.call{ value: amount }("");
        if (!success) {
            revert FAIL_TRANSFER();
        }
    }

    receive() external payable {
        depositTo(msg.sender);
    }
}
