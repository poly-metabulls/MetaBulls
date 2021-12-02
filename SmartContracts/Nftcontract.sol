pragma solidity ^0.8.0;
pragma abicoder v2; // required to accept structs as function parameters

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-solidity/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "openzeppelin-solidity/contracts/utils/cryptography/ECDSA.sol";
import "openzeppelin-solidity/contracts/utils/cryptography/draft-EIP712.sol";
import "openzeppelin-solidity/contracts/access/AccessControl.sol";

contract Nftcontract is ERC721URIStorage, EIP712 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string private SIGNING_DOMAIN;
    string private constant SIGNATURE_VERSION = "1";
    event MadeContact(address hostaddress, string symbol);
    uint256 counter = 0;
    string public eventdata;
    address public owner;
    mapping(address => int256) public own;
    mapping(uint256 => uint256[10]) public power;
    address private _mastercontract; 
    event mintnft(uint tokenid,address owner,string uri,uint[10] power);
    event locknft(uint tokenid);
    event unlocknft(uint tokenid);


    constructor(
        string memory symbol,
        string memory name,
        string memory uri,
        string memory sign_domain
    ) public ERC721(name, symbol) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        own[tx.origin] = 1;
        SIGNING_DOMAIN = sign_domain;
        owner = tx.origin;
    }

     modifier onlyMaster() {
        require(
            _mastercontract == msg.sender,
            "Function only for FightDie contract!"
        );
        _;
    }

    /*{
       
       
           _mint(tx.origin, counter);
        _setTokenURI(counter, uri);
        SIGNING_DOMAIN = sign_domain;
       
    }*/

    function addmaintainer(address addr) public {
        own[addr] = 1;
    }

    struct NFTVoucher {
        uint256 tokenId;
        string uri;
        uint256 price;
        uint256[10] power;
        bytes signature;
    }

    function redeem(address redeemer, NFTVoucher calldata voucher)
        public
        payable
        returns (uint256)
    {
        address payable signer = payable(_verify(voucher));

        require(msg.value >= voucher.price, "Insufficient funds to redeem");
        power[voucher.tokenId] = voucher.power;
        // first assign the token to the signer, to establish provenance on-chain
        // 0 for strength , 1 for stamina
        _mint(owner, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.uri);

        // transfer the token to the redeemer
        _transfer(owner, redeemer, voucher.tokenId);
        payable(owner).transfer(msg.value);

        // record payment to signer's withdrawal balance
        emit mintnft(voucher.tokenId,redeemer,voucher.uri,voucher.power);
        return voucher.tokenId;
    }

    function getData(uint256 tokenId)  external view returns (uint256[10] memory){
        return power[tokenId];

    }

    function getMix(uint256 tokenId) public view returns (string memory x,uint256[10] memory y){
        return (tokenURI(tokenId),power[tokenId]);

    }

    function lock(uint256 tokenid) external onlyMaster payable{

        require(ownerOf(tokenid) == tx.origin,"Can't lock someone else's nft");
        _transfer(tx.origin,_mastercontract,tokenid);
        emit locknft(tokenid);
    }

    function unlock(uint256 tokenid) external onlyMaster payable{

  
        _transfer(_mastercontract,tx.origin,tokenid);
        emit unlocknft(tokenid);
    }


    function _hash(NFTVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "NFTVoucher(uint256 tokenId,uint256,string uri)"
                        ),
                        voucher.tokenId,
                        keccak256(bytes(voucher.uri))
                    )
                )
            );
    }

    function _verify(NFTVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

     function setMasterContract(address _newmaster)
        external
        
        returns (bool)
    {
        require(msg.sender==owner,"you are not owner");
        _mastercontract = _newmaster;
        return true;
    }

   
}
