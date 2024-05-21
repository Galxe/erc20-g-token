// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

interface IWETH9Like {
    function deposit() external payable;

    function withdraw(uint256 _amount) external;
}
