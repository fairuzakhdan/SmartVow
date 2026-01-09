// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SmartVow} from "../src/SmartVow.sol";

contract DeploySmartVow is Script {
    function run() public returns (SmartVow) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        SmartVow smartVow = new SmartVow();
        
        console.log("SmartVow deployed at:", address(smartVow));
        console.log("Mediator:", smartVow.mediator());
        
        vm.stopBroadcast();
        
        return smartVow;
    }
}
