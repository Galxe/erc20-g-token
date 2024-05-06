// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

/// @title ILimitedMinter is a simplified version of IXERC20 with no lockbox and no permission to burn.
/// This is for ERC20 tokens that can be bridged cross-chain natively.
/// Minters can mint tokens for users, but only up to a certain limit per a period of time.
/// Minters can be trusted bridges, or other contracts that need to mint tokens for users.
interface ILimitedMinter {
    /// @notice Emits when a limit is set
    /// @param _minter The address of the minter we are setting the limit too
    /// @param _mintingLimit The updated minting limit we are setting to the minter
    /// @param _duration The duration window for maxLimit to be replenished
    event MinterLimitsSet(address indexed _minter, uint256 _mintingLimit, uint256 _duration);

    /// @notice Emits when a minter mints tokens
    /// @param _minter The address of the minter
    /// @param _to The address of the user receiving the tokens
    /// @param _amount The amount of tokens being minted
    event MinterMinted(address indexed _minter, address indexed _to, uint256 _amount);

    /// @notice Reverts when a user with too low of a limit tries to call mint
    error ILimitedMinter_NotEnoughLimits();

    /// @notice Reverts when a user tries to set a duration of 0
    error ILimitedMinter_InvalidDuration();

    /// @notice Reverts when limits are too high
    error ILimitedMinter_LimitsTooHigh();

    /// @notice Contains the mint parameters
    /// @param timestamp The timestamp of the last mint
    /// @param maxLimit The max limit of the minter
    /// @param duration The duration window for maxLimit
    /// @param currentLimit The current limit of the minter
    struct MinterConfig {
        uint256 timestamp;
        uint256 maxLimit;
        uint256 duration;
        uint256 currentLimit;
    }

    /// @notice Returns the max limit of a minter
    /// @param _minter The minter we are viewing the limits of
    /// @return _limit The limit the minter has
    function mintingMaxLimitOf(address _minter) external view returns (uint256 _limit);

    /// @notice Returns the current limit of a minter
    /// @param _minter The minter we are viewing the limits of
    /// @return _limit The limit the minter has
    function mintingCurrentLimitOf(address _minter) external view returns (uint256 _limit);
}
