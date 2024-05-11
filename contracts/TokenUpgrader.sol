// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

/// @title TokenUpgrader Contract for upgrading old tokens to new tokens
/// @author Gravity Team
/// @notice Customized for upgrading old tokens to new tokens, compatible with unburnable and no-permit tokens
contract TokenUpgrader is Ownable2Step, Pausable {
    using SafeERC20 for IERC20;

    error Uninitialized();
    error AlreadyInitialized();

    /// @dev The address to which the old tokens are sent to burn
    address public constant DEAD_ADDRESS = address(0xdead);
    /// @notice The ratio of new tokens to old tokens
    uint256 public constant SPLIT_RATIO = 60;

    IERC20 public oldToken;
    IERC20 public newToken;
    bool public initialized;

    constructor(address initialAdmin) Ownable(initialAdmin) {}

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    /// Withdraw ERC20 token from the contract
    /// @param token the address of the token to withdraw
    /// @param to the receiver of the token
    /// @param amount the amount of token to withdraw
    function withdrawERC20Token(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    /// Withdraw ETH from the contract
    /// @param to address to receive the ETH
    /// @param amount amount of ETH to withdraw
    function withdrawETH(address to, uint256 amount) external onlyOwner {
        payable(to).transfer(amount);
    }

    /// initialize the contract with the old and new token addresses.
    /// @param oldTokenAddress The address of the old token contract
    /// @param newTokenAddress The address of the new token contract
    function initialize(address oldTokenAddress, address newTokenAddress) public onlyOwner {
        if (initialized) {
            revert AlreadyInitialized();
        }
        initialized = true;
        oldToken = IERC20(oldTokenAddress);
        newToken = IERC20(newTokenAddress);
    }

    /// @notice upgrade old tokens to new tokens
    /// @dev msg.sender must approve the amount of old tokens to be upgraded before calling this function.
    /// @param amount The amount of old tokens to upgrade.
    function upgradeToken(uint256 amount) external onlyInitialized whenNotPaused returns (bool) {
        // compatible with unburnable tokens
        oldToken.safeTransferFrom(msg.sender, DEAD_ADDRESS, amount);
        newToken.safeTransfer(msg.sender, amount * SPLIT_RATIO);
        return true;
    }

    /// @notice upgrade old tokens to new tokens using permit
    /// @param amount The amount of old tokens to upgrade.
    /// @param deadline The deadline timestamp for the permit signature.
    /// @param v secp256k1 signature: v
    /// @param r secp256k1 signature: r
    /// @param s secp256k1 signature: s
    function upgradeTokenByPermit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyInitialized whenNotPaused returns (bool) {
        // permit signature front-run protection
        /* solhint-disable no-empty-blocks */
        try IERC20Permit(address(oldToken)).permit(msg.sender, address(this), amount, deadline, v, r, s) {} catch {}
        /* solhint-enable no-empty-blocks */

        // compatible with unburnable tokens
        oldToken.safeTransferFrom(msg.sender, DEAD_ADDRESS, amount);
        newToken.safeTransfer(msg.sender, amount * SPLIT_RATIO);
        return true;
    }

    modifier onlyInitialized() {
        if (!initialized) {
            revert Uninitialized();
        }
        _;
    }
}
