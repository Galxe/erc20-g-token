// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ILimitedMinterManager } from "./interfaces/ILimitedMinterManager.sol";

contract LimitedMinterManager is ILimitedMinterManager {
    /// @notice Maps minter address to minter configurations
    mapping(address => MinterConfig) private _minterConfigs;
    /// @notice Array of minters, making minters enumerable.
    address[] private _minters;

    /// @notice Get the total number of minters
    function getMinterCount() public view returns (uint256) {
        return _minters.length;
    }

    /// @notice Retrieve the address of a minter by index
    /// @param _index The index of the minter
    function getMinterByIndex(uint256 _index) public view returns (address) {
        if (_index >= _minters.length) {
            revert ILimitedMinterManager_InvalidIndex();
        }
        return _minters[_index];
    }

    /// @notice Retrieve the minter configuration
    /// @param _minter The address of the minter
    function getMinterConfig(address _minter) public view returns (MinterConfig memory) {
        return _minterConfigs[_minter];
    }

    /// @notice Remove the minter using the index hint.
    /// @dev Can only be called by the owner. Allowing deletion of minter gives
    ///      the owner the ability reset the minters status, clearing the currentLimit and timestamp.
    function _removeMinterByIndexHint(address _minter, uint256 _index) internal {
        if (_index >= _minters.length) {
            revert ILimitedMinterManager_InvalidIndex();
        }
        if (_minters[_index] != _minter) {
            revert ILimitedMinterManager_InvalidIndexHint();
        }
        delete _minterConfigs[_minter];
        if (_index != _minters.length - 1) {
            _minters[_index] = _minters[_minters.length - 1];
        }
        _minters.pop();
        emit MinterRemoved(_minter);
    }

    /// @notice Updates the limits of a minter, minter will NOT be deleted if the limit is set to 0.
    /// @param _minter The address of the minter we are setting the limits too
    /// @param _mintingLimit The updated minting limit we are setting to the minter
    /// @param _duration The duration window for maxLimit to be replenished
    function _setMinterLimit(address _minter, uint256 _mintingLimit, uint256 _duration) internal {
        if (_mintingLimit > (type(uint256).max / 2)) {
            revert ILimitedMinterManager_LimitsTooHigh();
        }
        if (_duration == 0) {
            revert ILimitedMinterManager_InvalidDuration();
        }
        // The duration can never be 0 for a minter, so when duration is currently 0
        // this is a new minter being added.
        if (_minterConfigs[_minter].duration == 0) {
            _minters.push(_minter);
            emit MinterNewlyAdded(_minter);
        }
        _changeMinterLimit(_minter, _mintingLimit, _duration);
        emit MinterLimitsSet(_minter, _mintingLimit, _duration);
    }

    /// @notice use minter's limit to mint token, revert if not enough
    /// @dev Can only be called by the minter
    /// @param _minter The minter address
    /// @param _amount The amount of tokens being minted
    function _minterMint(address _minter, uint256 _amount) internal {
        uint256 _currentLimit = mintingCurrentLimitOf(_minter);
        if (_currentLimit < _amount) revert ILimitedMinterManager_NotEnoughLimits();
        _useMinterLimits(_minter, _amount);
        emit MinterMinted(_minter, _minter, _amount);
    }

    /// @notice Returns the max limit of a minter
    /// @param _minter the minter we are viewing the limits of
    /// @return _limit The limit the minter has
    function mintingMaxLimitOf(address _minter) public view returns (uint256 _limit) {
        _limit = _minterConfigs[_minter].maxLimit;
    }

    /// @notice Returns the current limit of a minter
    /// @param _minter the minter we are viewing the limits of
    /// @return _limit The limit the minter has
    function mintingCurrentLimitOf(address _minter) public view returns (uint256 _limit) {
        // not a minter
        if (_minterConfigs[_minter].duration == 0) {
            return 0;
        }
        _limit = _getCurrentLimit(
            _minterConfigs[_minter].currentLimit,
            _minterConfigs[_minter].maxLimit,
            _minterConfigs[_minter].duration,
            _minterConfigs[_minter].timestamp
        );
    }

    /// @notice Uses the limit of any minter
    /// @param _minter The address of the minter who is being changed
    /// @param _change The change in the limit
    function _useMinterLimits(address _minter, uint256 _change) private {
        uint256 _currentLimit = mintingCurrentLimitOf(_minter);
        _minterConfigs[_minter].timestamp = block.timestamp;
        _minterConfigs[_minter].currentLimit = _currentLimit - _change;
    }

    /// @notice Updates the limit of any minter
    /// @dev Can only be called by the owner
    /// @param _minter The address of the minter we are setting the limit too
    /// @param _limit The updated limit we are setting to the minter
    /// @param _duration The duration window for maxLimit to be replenished
    function _changeMinterLimit(address _minter, uint256 _limit, uint256 _duration) private {
        uint256 _oldLimit = _minterConfigs[_minter].maxLimit;
        uint256 _currentLimit = mintingCurrentLimitOf(_minter);
        _minterConfigs[_minter].maxLimit = _limit;

        _minterConfigs[_minter].currentLimit = _calculateNewCurrentLimit(_limit, _oldLimit, _currentLimit);
        _minterConfigs[_minter].timestamp = block.timestamp;
        _minterConfigs[_minter].duration = _duration;
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
