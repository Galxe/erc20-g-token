// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { ERC20Pausable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

import { LimitedMinterManager } from "./LimitedMinterManager.sol";

/// @title Galxe G Token (ERC20) Contract
/// @author Galxe Team
/// @notice G token supports:
/// - pausable transfers, minting and burning
/// - ERC20Permit signatures for approvals
/// - native cross-chain ERC20 by supporting limited minter management for bridges.
/// @custom:security-contact security@galxe.com
contract GalxeTokenG is ERC20, ERC20Burnable, ERC20Pausable, ERC20Permit, LimitedMinterManager, Ownable2Step {
    string private _newName;

    constructor(address initialAdmin) ERC20("Galxe", "G") ERC20Permit("Galxe G Token") Ownable(initialAdmin) {
        _newName = super.name();
    }

    /// @notice Pauses the contract.
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Unpauses the contract.
    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Returns the name of the token.
    /// @dev This is a custom function that overrides the OpenZeppelin function.
    function name() public view override returns (string memory) {
        return _newName;
    }

    /// @notice Sets the name of the token.
    /// @dev This gives the owner the ability to change the name of the token.
    function setName(string memory newName) public onlyOwner {
        _newName = newName;
    }

    /// ownerMint can only be called by the owner for initial token distribution
    /// @param to token receiver
    /// @param amount amount of tokens to mint
    function ownerMint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // Overrides required by Solidity.
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    // cross chain bridge minting

    /// @notice Sets the minting limits for a minter
    /// @param _minter the address of the minter
    /// @param _mintingLimit the limited amount of tokens that can be minted in a period
    /// @param _duration the duration window for minting limit.
    function setMinterLimit(address _minter, uint256 _mintingLimit, uint256 _duration) public onlyOwner {
        _setMinterLimit(_minter, _mintingLimit, _duration);
    }

    /// @notice Removes a minter
    /// @dev Can only be called by the owner. Since add/remove minters can only be done by the owner,
    ///      this indexHint is safe from DoS attacks.
    /// @param _minter The address of the minter we are deleting
    /// @param _indexHint The index hint of the minter
    function removeMinterByIndexHint(address _minter, uint256 _indexHint) public onlyOwner {
        _removeMinterByIndexHint(_minter, _indexHint);
    }

    /// @notice Mints tokens for a user by minter
    /// @dev Can only be called by a bridge
    /// @param _user The address of the user who needs tokens minted
    /// @param _amount The amount of tokens being minted
    function mint(address _user, uint256 _amount) public {
        // will revert if not enough limits
        _minterMint(msg.sender, _amount);
        _mint(_user, _amount);
    }
}
