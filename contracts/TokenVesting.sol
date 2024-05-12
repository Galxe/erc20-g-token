// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TokenVesting is Ownable2Step {
    using SafeERC20 for IERC20;

    /// @notice Emitted when tokens are released.
    /// @param token the address of the ERC20 token to be vested.
    /// @param amount the amount of token to be vested.
    event TokensReleased(address token, uint256 amount);

    error InvalidToken();
    error InvalidDuration();
    error InvalidNumVestings();
    error NoTokenReleasable();
    error InvalidRecoverTokenAddress();
    error FailedToSendEther();

    /// @notice ERC20 token that is being vested
    IERC20 public immutable token;
    /// @notice Start time of the vesting, UNIX timestamp.
    uint256 public immutable start;
    /// @notice Duration (cliff) between vesting, in seconds.
    uint256 public immutable duration;
    /// @notice The number of vestings.
    uint256 public immutable numVestings;
    /// @notice The amount of token that has been released.
    uint256 public released;

    /// @dev Creates a vesting contract that vests its balance of ERC20 token to the
    ///      owner. (total/numVesting) Tokens are vested every duration since start.
    /// @param _token address of token ERC20 token.
    /// @param _start the time (as Unix timestamp) at which point vesting starts
    /// @param _duration the time between vesting
    /// @param _numVestings the number of vesting
    constructor(
        address _owner,
        address _token,
        uint256 _start,
        uint256 _duration,
        uint256 _numVestings
    ) Ownable(_owner) {
        if (_token == address(0)) revert InvalidToken();
        if (_duration == 0) revert InvalidDuration();
        if (_numVestings == 0) revert InvalidNumVestings();

        token = IERC20(_token);
        start = _start;
        duration = _duration;
        numVestings = _numVestings;
    }

    /// @notice Transfers vested tokens to owner.
    function release() external {
        uint256 unreleased = releasableAmount();
        if (unreleased == 0) revert NoTokenReleasable();
        released = released + unreleased;
        token.safeTransfer(owner(), unreleased);
        emit TokensReleased(address(token), unreleased);
    }

    /// @notice Calculates the amount that has already vested but hasn't been released yet.
    /// @return the amount of vested tokens that can be released to the beneficiary.
    function releasableAmount() public view returns (uint256) {
        return _vestedAmount() - released;
    }

    /// @notice Calculates the amount that has already vested.
    /// @return the amount of vested tokens.
    function _vestedAmount() private view returns (uint256) {
        uint256 currentBalance = token.balanceOf(address(this));
        uint256 totalBalance = currentBalance + released;
        if (block.timestamp < start) {
            // not start
            return 0;
        } else if (block.timestamp >= start + duration * numVestings) {
            // all vested, transfer out all remaining tokens.
            return totalBalance;
        } else {
            // For every duration passed after start, vest (totalBalance / numVestings) tokens.
            return ((block.timestamp - start) / duration) * (totalBalance / numVestings);
        }
    }

    /// @notice Recover other ERC20 token from contract
    /// @param tokenAddress ERC20 token address to recover
    /// @param tokenAmount amount of token to recover
    function recoverOtherERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        if (tokenAddress == address(token)) revert InvalidRecoverTokenAddress();
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    }

    /// @notice Recover native token from contract
    function recoverNativeToken() external onlyOwner {
        (bool sent, ) = this.owner().call{ value: address(this).balance }("");
        if (!sent) revert FailedToSendEther();
    }
}
