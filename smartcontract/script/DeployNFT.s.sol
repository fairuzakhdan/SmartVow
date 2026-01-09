// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MarriageCertificateNFT} from "../src/MarriageCertificateNFT.sol";

contract DeployNFT is Script {
    function run() public returns (MarriageCertificateNFT) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address smartVowAddress = vm.envAddress("SMARTVOW_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        MarriageCertificateNFT nft = new MarriageCertificateNFT(smartVowAddress);
        
        console.log("MarriageCertificateNFT deployed at:", address(nft));
        console.log("Owner:", nft.owner());
        console.log("Mint Price:", nft.mintPrice());
        
        vm.stopBroadcast();
        
        return nft;
    }
}
