// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ILimitedMinter } from "./interfaces/ILimitedMinter.sol";

contract LimitedMinter is ILimitedMinter {
    /// @notice Maps minter address to minter configurations
    mapping(address => MinterConfig) public minters;

    /// @notice Updates the limits of a minter, minter will be deleted if the limit is set to 0.
    /// @dev Can only be called by the owner
    /// @param _minter The address of the minter we are setting the limits too
    /// @param _mintingLimit The updated minting limit we are setting to the minter
    /// @param _duration The duration window for maxLimit to be replenished
    function _setMinterLimit(address _minter, uint256 _mintingLimit, uint256 _duration) internal {
        if (_mintingLimit > (type(uint256).max / 2)) {
            revert ILimitedMinter_LimitsTooHigh();
        }
        if (_duration == 0) {
            revert ILimitedMinter_InvalidDuration();
        }

        // If the limit is 0, delete the minter
        if (_mintingLimit == 0) {
            delete minters[_minter];
            return;
        }
        // otherwise, update the minter
        _changeMinterLimit(_minter, _mintingLimit, _duration);
        emit MinterLimitsSet(_minter, _mintingLimit, _duration);
    }

    /// @notice use minter's limit to mint token, revert if not enough
    /// @dev Can only be called by the minter
    /// @param _minter The minter address
    /// @param _amount The amount of tokens being minted
    function _minterMint(address _minter, uint256 _amount) internal {
        uint256 _currentLimit = mintingCurrentLimitOf(_minter);
        if (_currentLimit < _amount) revert ILimitedMinter_NotEnoughLimits();
        _useMinterLimits(_minter, _amount);
        emit MinterMinted(_minter, _minter, _amount);
    }

    /// @notice Returns the max limit of a minter
    /// @param _minter the minter we are viewing the limits of
    /// @return _limit The limit the minter has
    function mintingMaxLimitOf(address _minter) public view returns (uint256 _limit) {
        _limit = minters[_minter].maxLimit;
    }

    /// @notice Returns the current limit of a minter
    /// @param _minter the minter we are viewing the limits of
    /// @return _limit The limit the minter has
    function mintingCurrentLimitOf(address _minter) public view returns (uint256 _limit) {
        _limit = _getCurrentLimit(
            minters[_minter].currentLimit,
            minters[_minter].maxLimit,
            minters[_minter].duration,
            minters[_minter].timestamp
        );
    }

    /// @notice Uses the limit of any minter
    /// @param _minter The address of the minter who is being changed
    /// @param _change The change in the limit
    function _useMinterLimits(address _minter, uint256 _change) private {
        uint256 _currentLimit = mintingCurrentLimitOf(_minter);
        minters[_minter].timestamp = block.timestamp;
        minters[_minter].currentLimit = _currentLimit - _change;
    }

    /// @notice Updates the limit of any minter
    /// @dev Can only be called by the owner
    /// @param _minter The address of the minter we are setting the limit too
    /// @param _limit The updated limit we are setting to the minter
    /// @param _duration The duration window for maxLimit to be replenished
    function _changeMinterLimit(address _minter, uint256 _limit, uint256 _duration) private {
        uint256 _oldLimit = minters[_minter].maxLimit;
        uint256 _currentLimit = mintingCurrentLimitOf(_minter);
        minters[_minter].maxLimit = _limit;

        minters[_minter].currentLimit = _calculateNewCurrentLimit(_limit, _oldLimit, _currentLimit);
        minters[_minter].timestamp = block.timestamp;
        minters[_minter].duration = _duration;
    }

    /// @notice Updates the current limit
    /// @param _limit The new limit
    /// @param _oldLimit The old limit
    /// @param _currentLimit The current limit
    /// @return _newCurrentLimit The new current limit
    function _calculateNewCurrentLimit(
        uint256 _limit,
        uint256 _oldLimit,
        uint256 _currentLimit
    ) internal pure returns (uint256 _newCurrentLimit) {
        uint256 _difference;

        if (_oldLimit > _limit) {
            _difference = _oldLimit - _limit;
            _newCurrentLimit = _currentLimit > _difference ? _currentLimit - _difference : 0;
        } else {
            _difference = _limit - _oldLimit;
            _newCurrentLimit = _currentLimit + _difference;
        }
    }

    /// @notice Gets the current limit
    /// @param _currentLimit The current limit
    /// @param _maxLimit The max limit
    /// @param _duration The duration window for maxLimit
    /// @return _limit The current limit
    function _getCurrentLimit(
        uint256 _currentLimit,
        uint256 _maxLimit,
        uint256 _duration,
        uint256 _timestamp
    ) internal view returns (uint256 _limit) {
        _limit = _currentLimit;
        if (_limit == _maxLimit) {
            return _limit;
        } else if (_timestamp + _duration <= block.timestamp) {
            _limit = _maxLimit;
        } else if (_timestamp + _duration > block.timestamp) {
            uint256 _timePassed = block.timestamp - _timestamp;
            uint256 _calculatedLimit = _limit + ((_timePassed * _maxLimit) / _duration);
            _limit = _calculatedLimit > _maxLimit ? _maxLimit : _calculatedLimit;
        }
    }
}
