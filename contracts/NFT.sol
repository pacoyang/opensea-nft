// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721, Ownable {
  using Counters for Counters.Counter;

  Counters.Counter public currentTokenId;

  string public baseTokenURI;

  event NewOwner(address indexed sender, uint256 token_id);

  constructor() ERC721("Pokemon", "PKMN") {
    baseTokenURI = "";
  }

  function mintTo(address recipient) public returns (uint256) {
    currentTokenId.increment();
    uint256 newItemId = currentTokenId.current();
    _safeMint(recipient, newItemId);
    emit NewOwner(msg.sender, newItemId);
    return newItemId;
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return baseTokenURI;
  }

  function setBaseTokenURI(string memory _baseTokenURI) public onlyOwner {
    baseTokenURI = _baseTokenURI;
  }
}
