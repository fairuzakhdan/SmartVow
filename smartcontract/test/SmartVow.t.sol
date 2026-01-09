// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {SmartVow} from "../src/SmartVow.sol";

contract SmartVowTest is Test {
    SmartVow public smartVow;
    
    address public mediator;
    address public alice;
    address public bob;
    
    uint256 constant ESCROW_AMOUNT = 1 ether;

    function setUp() public {
        mediator = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        
        smartVow = new SmartVow();
        
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function test_CreateVow() public {
        vm.prank(alice);
        uint256 vowId = smartVow.createVow(bob, "ipfs://metadata");
        
        assertEq(vowId, 1);
        
        SmartVow.Vow memory vow = smartVow.getVow(vowId);
        assertEq(vow.partnerA, alice);
        assertEq(vow.partnerB, bob);
        assertEq(uint(vow.status), uint(SmartVow.VowStatus.Draft));
    }

    function test_AddCondition() public {
        vm.prank(alice);
        uint256 vowId = smartVow.createVow(bob, "ipfs://metadata");
        
        vm.prank(alice);
        smartVow.addCondition(vowId, SmartVow.ConditionType.Infidelity, "Tidak boleh selingkuh", 5000);
        
        SmartVow.Condition[] memory conditions = smartVow.getConditions(vowId);
        assertEq(conditions.length, 1);
        assertEq(conditions[0].penaltyPercentage, 5000);
    }

    function test_SignAndActivate() public {
        // Create vow
        vm.prank(alice);
        uint256 vowId = smartVow.createVow(bob, "ipfs://metadata");
        
        // Both sign
        vm.prank(alice);
        smartVow.signVow(vowId);
        
        vm.prank(bob);
        smartVow.signVow(vowId);
        
        // Deposit and activate
        vm.prank(alice);
        smartVow.depositAndActivate{value: ESCROW_AMOUNT}(vowId);
        
        SmartVow.Vow memory vow = smartVow.getVow(vowId);
        assertEq(uint(vow.status), uint(SmartVow.VowStatus.Active));
        assertEq(vow.escrowBalance, ESCROW_AMOUNT);
    }


    function test_ReportBreachAndResolve() public {
        // Setup active vow
        vm.prank(alice);
        uint256 vowId = smartVow.createVow(bob, "ipfs://metadata");
        
        vm.prank(alice);
        smartVow.addCondition(vowId, SmartVow.ConditionType.KDRT, "Tidak boleh KDRT", 7000);
        
        vm.prank(alice);
        smartVow.signVow(vowId);
        vm.prank(bob);
        smartVow.signVow(vowId);
        
        vm.prank(alice);
        smartVow.depositAndActivate{value: ESCROW_AMOUNT}(vowId);
        
        // Report breach (mediator)
        smartVow.reportBreach(vowId, 0);
        
        SmartVow.Vow memory vow = smartVow.getVow(vowId);
        assertEq(uint(vow.status), uint(SmartVow.VowStatus.Breached));
        
        // Resolve - alice gets 70%
        uint256 aliceBalanceBefore = alice.balance;
        smartVow.resolveDispute(vowId, alice, 7000);
        
        assertEq(alice.balance, aliceBalanceBefore + 0.7 ether);
    }

    function test_TerminateVow() public {
        // Setup active vow
        vm.prank(alice);
        uint256 vowId = smartVow.createVow(bob, "ipfs://metadata");
        
        vm.prank(alice);
        smartVow.signVow(vowId);
        vm.prank(bob);
        smartVow.signVow(vowId);
        
        vm.prank(alice);
        smartVow.depositAndActivate{value: ESCROW_AMOUNT}(vowId);
        
        uint256 aliceBalanceBefore = alice.balance;
        uint256 bobBalanceBefore = bob.balance;
        
        // Terminate (50-50 split)
        smartVow.terminateVow(vowId);
        
        assertEq(alice.balance, aliceBalanceBefore + 0.5 ether);
        assertEq(bob.balance, bobBalanceBefore + 0.5 ether);
    }

    function test_RevertWhen_CannotSignTwice() public {
        vm.prank(alice);
        uint256 vowId = smartVow.createVow(bob, "ipfs://metadata");
        
        vm.prank(alice);
        smartVow.signVow(vowId);
        
        vm.prank(alice);
        vm.expectRevert("Already signed");
        smartVow.signVow(vowId);
    }

    function test_RevertWhen_OnlyMediatorCanReportBreach() public {
        vm.prank(alice);
        uint256 vowId = smartVow.createVow(bob, "ipfs://metadata");
        
        vm.prank(alice);
        smartVow.signVow(vowId);
        vm.prank(bob);
        smartVow.signVow(vowId);
        
        vm.prank(alice);
        smartVow.depositAndActivate{value: ESCROW_AMOUNT}(vowId);
        
        vm.prank(alice);
        vm.expectRevert("Only mediator");
        smartVow.reportBreach(vowId, 0);
    }
}
