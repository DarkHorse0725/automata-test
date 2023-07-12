// SPDX-License-Identifier: MIT
// Further information: https://eips.ethereum.org/EIPS/eip-2770
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Forwarder Smart Contract
 * @author Pascal Marco Caversaccio, pascal.caversaccio@hotmail.ch
 * @dev Simple forwarder for extensible meta-transaction forwarding.
 */

contract Receiver is Ownable, EIP712 {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;       // Externally-owned account (EOA) making the request.
        address to;         // Destination address, normally a smart contract.
        uint256 value;      // Amount of ether to transfer to the destination.
        uint256 gas;        // Amount of gas limit to set for the execution.
        uint256 nonce;      // On-chain tracked nonce of a transaction.
        bytes data;         // (Call)data to be sent to the destination.
    }

    bytes32 private constant _TYPEHASH = keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)");

    mapping(address => uint256) private _nonces;
    mapping(address => bool) private _senderWhitelist;

    event MetaTransactionExecuted(address indexed from, address indexed to, bytes indexed data);
    event FailedTransaction(address indexed from, address indexed to, bytes indexed data);
    event AddressWhitelisted(address indexed sender);
    event AddressRemovedFromWhitelist(address indexed sender);

    constructor(string memory name, string memory version) EIP712(name, version) {
        address msgSender = msg.sender;
        addSenderToWhitelist(msgSender);
    }

    /**
     * @dev Returns the domain separator used in the encoding of the signature for `execute`, as defined by {EIP712}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @dev Retrieves the on-chain tracked nonce of an EOA making the request.
    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    /**
     * @dev Verifies the signature based on typed structured data.
     */
    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        address signer = _hashTypedDataV4(keccak256(abi.encode(
            _TYPEHASH,
            req.from,
            req.to,
            req.value,
            req.gas,
            req.nonce,
            keccak256(req.data)
        ))).recover(signature);
        return _nonces[req.from] == req.nonce && signer == req.from;
    }

    /// @dev Main function; executes the meta-transaction via a low-level call.
    function execute(ForwardRequest[] calldata req, bytes[] calldata signature) public payable returns (bool[] memory, bytes[] memory) {
        require(_senderWhitelist[msg.sender], "AwlForwarder: sender of meta-transaction is not whitelisted");
        require(req.length == signature.length, "AwlForwarder: no matches of params");
        bool[] memory res = new bool[](req.length);
        bytes[] memory resBytes = new bytes[](req.length);
        uint256 gas;
        for(uint256 i = 0; i < req.length; i++) {
            if(!verify(req[i], signature[i])) {         // skip this transaction
                res[i] = false;
                resBytes[i] = '';
                _nonces[req[i].from] = req[i].nonce + 1;
                emit FailedTransaction(req[i].from, req[i].to, req[i].data);
                continue;
            }
            _nonces[req[i].from] = req[i].nonce + 1;

            // solhint-disable-next-line avoid-low-level-calls
            (bool success, bytes memory returndata) = req[i].to.call{gas: req[i].gas}(abi.encodePacked(req[i].data, req[i].from));
            
            if (!success) {
                res[i] = false;
                resBytes[i] = '';
                emit FailedTransaction(req[i].from, req[i].to, req[i].data);
            } else {
                res[i] = true;
                resBytes[i] = returndata;
                gas += req[i].gas;
                emit MetaTransactionExecuted(req[i].from, req[i].to, req[i].data);
            }
        }

        /**
        * @dev Validates that the relayer/forwarder EOA has sent enough gas for the call.
        * See https://ronan.eth.link/blog/ethereum-gas-dangers/.
        * This is because EIP-150 ensure the caller is left with at least 1/64 of the gas available, regardless of what happens to the call.
        */
        assert(gasleft() > gas / 63);
        return (res, resBytes);
    }

    /// @dev Only whitelisted addresses are allowed to broadcast meta-transactions.
    function addSenderToWhitelist(address sender) public onlyOwner() {
        require(!isWhitelisted(sender), "AwlForwarder: sender address is already whitelisted"); // This requirement prevents registry duplication.
        _senderWhitelist[sender] = true;
        emit AddressWhitelisted(sender);
    }

    /// @dev Removes a whitelisted address.
    function removeSenderFromWhitelist(address sender) public onlyOwner() {
        _senderWhitelist[sender] = false;
        emit AddressRemovedFromWhitelist(sender);
    }

    /// @dev Retrieves the information whether an address is whitelisted or not.
    function isWhitelisted(address sender) public view returns (bool) {
        return _senderWhitelist[sender];
    }

    /// @dev Destroys the Forwarder contract and transfers all ether to a pre-defined payout address.
    function killForwarder(address payable payoutAddress) public onlyOwner() {
        payoutAddress.transfer(address(this).balance);
        selfdestruct(payoutAddress);
    }

    receive() external payable { }
}
