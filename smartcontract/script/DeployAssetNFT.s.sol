// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AssetNFT} from "../src/AssetNFT.sol";

contract DeployAssetNFT is Script {
    function run() external returns (AssetNFT) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AssetNFT assetNFT = new AssetNFT();
        
        console.log("AssetNFT deployed at:", address(assetNFT));
        console.log("Mint price:", assetNFT.mintPrice());
        
        vm.stopBroadcast();
        
        return assetNFT;
    }
}
