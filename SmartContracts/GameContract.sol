    pragma solidity ^0.8.0;
    pragma abicoder v2; // required to accept structs as function parameters
    
    
    
    interface INftcontract{
         function lock(uint256 tokenid) external  payable;
         function unlock(uint256 tokenid) external payable;
    }
    
    interface IERC721 {
        function balanceOf(address owner) external view returns (uint256 balance);
        function ownerOf(uint256 tokenId) external view returns (address owner);
        function safeTransferFrom(address from, address to, uint256 tokenId) external;
        function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
        function transferFrom(address from, address to, uint256 tokenId) external;
        function approve(address to, uint256 tokenId) external;
        function getApproved(uint256 tokenId) external view returns (address operator);
        function setApprovalForAll(address operator, bool _approved) external;
        function isApprovedForAll(address owner, address operator) external view returns (bool);
        function tokenURI(uint256 tokenId) external view returns (string memory);
    }
    
    
    interface ERC20I {
        function mintTo(address to, uint256 amount) external returns (bool);
    
        function balanceOf(address account) external view returns (uint256);
    
        function burnFromAcc(address from, uint256 amount) external returns (bool);
    }
    
    interface IFightGame{
        function fightdeclare(uint256 tokenid0, uint256 tokenid1, address nft,uint startblock) external returns(bool,uint,uint);
    }
    
    
    contract GameContract {
         
         address public nft;
         address public owner ;
         address[] public games;
         uint public gameid;
         address gameadd;
         address damage;
        event Participate0(uint gameid, address party0, uint256 tokenid0,bool locked0,bool resultdec);
        event Participate1(uint gameid,address party1,uint256 tokenid1,bool locked1,uint startblock);
        event Bet(address betor,uint amount,bool player,uint gameid);
        event Result(uint gameid,bool winner,uint damage0,uint damage1);
        event ClaimBet(uint gameid,address claimer,uint winamount);
        
       
    
        struct Bets{
            bool player;  //false = 0 , true =1;
            uint256 amount;
            bool paid;
        }
    
         
         struct Game {
             uint gameid;
             uint gamename;
             address party0;
             uint256 tokenid0;
             address party1;
             uint256 tokenid1;
             bool locked0;
             bool locked1;
             uint startblock;
             uint256 amount0;
             uint256 amount1;
             bool resultdec;
             uint damage0;
             uint damage1;
             bool winner;
             mapping (address=>Bets) bets;
    
    
         }
         mapping(uint=>Game) Games;
    
        constructor(
            address Nft,
            address gameAdd,
            address Damage
        ){
            gameid = 0;
            nft = Nft;
            owner = tx.origin;
            gameadd = gameAdd;
            damage = Damage;
            
    
        }
    
        function viewgame(uint gameId) public view returns(uint) {
            return Games[gameId].startblock;
        }
        function viewdmg(uint gameId) public view returns(uint) {
            return Games[gameId].damage0;
            
        }
    
        function viewwinner(uint gameId) public view returns(bool){
            return Games[gameId].winner;
        }
    
        function Addgame() internal{
            gameid++;
           
          
           
        }
    
        function Playerpart(uint256 tokenid) public {
            require(IERC721(nft).ownerOf(tokenid) == tx.origin,"You are not owner");
            
    
            
            if (Games[gameid].party0 == address(0) && Games[gameid].party1 == address(0)){
                
                Games[gameid].party0 = tx.origin;
                Games[gameid].tokenid0 = tokenid;
                INftcontract(nft).lock(tokenid);
                Games[gameid].locked0 = true;
                emit Participate0(gameid,Games[gameid].party0,tokenid,true,false);
            }
            else{
                uint num;
                if(gameid==0){
                    num = block.number;
                }
                else{
                num = block.number < Games[gameid-1].startblock+20 ?  Games[gameid-1].startblock+20:block.number;
                }
                Games[gameid].startblock = num+20;
                Games[gameid].party1 = tx.origin;
                Games[gameid].tokenid1 = tokenid;
                INftcontract(nft).lock(tokenid);
                Games[gameid].locked1 = true;
                emit Participate1(gameid,tx.origin,tokenid,true,num+20);
                Addgame();
            
            }
    
        }
    
    
    
        function PlaceBet( uint256 gameId,bool bet) payable public {
            require(Games[gameId].party0 !=address(0) && Games[gameId].party1 != address(0));
            require(Games[gameId].bets[tx.origin].amount == 0,"you have already placed a bet");
            require(Games[gameId].startblock > block.number,"Game already started");
            Games[gameId].bets[tx.origin].amount = msg.value;
            Games[gameId].bets[tx.origin].player = bet;
    
            if(bet){
                Games[gameId].amount1 += msg.value;
            }
            else{
                 Games[gameId].amount0 += msg.value;
            }
            emit Bet(tx.origin,msg.value,bet,gameId);
        }
    
    
        function winclaim(uint256 gameId) public {
            Game storage curr = Games[gameId];
            require(block.number > curr.startblock+20);
            
            require(curr.bets[tx.origin].amount > 0);
            require(curr.bets[tx.origin].paid == false);
            if(curr.resultdec == false){
                require(block.number < curr.startblock+256);
                (bool winner,uint damage0 , uint damage1) = IFightGame(gameadd).fightdeclare(curr.tokenid0,curr.tokenid1,nft,curr.startblock);
                curr.resultdec = true;
                curr.winner = winner;
                Games[gameId].damage0 = damage0;
                Games[gameId].damage1 = damage1;
                Games[gameId].winner = winner;
                Games[gameId].resultdec = true;
                emit Result(gameId,winner,damage0,damage1);
            }
            
            if(curr.bets[tx.origin].player == curr.winner){
                address payable receiver = payable(tx.origin);
                uint amount;
                if(curr.winner == true){
                    amount = curr.amount1;
                }
                else{
                    amount = curr.amount0;
                }
                uint total = curr.amount0+curr.amount1 ;
                uint finish = total - ((uint(total)*5)/100);
                uint funds = (finish*((curr.bets[tx.origin].amount*100)/amount))/100;
                Games[gameId].bets[tx.origin].paid = true;
            
                receiver.transfer(funds);
                emit ClaimBet(gameId,tx.origin,funds);
            
    
    
            }
            
    
            
            
           
        }  
    
        function claimnft(uint tokenid,uint gameId) public {
           
            if(Games[gameId].resultdec == false){
                require(block.number < Games[gameId].startblock+256,"startblock problem");
                (bool winner,uint damage0 , uint damage1) = IFightGame(gameadd).fightdeclare(Games[gameId].tokenid0,Games[gameId].tokenid1,nft,Games[gameId].startblock);
                Games[gameId].damage0 = damage0;
                Games[gameId].damage1 = damage1;
                Games[gameId].winner = winner;
                Games[gameId].resultdec = true;
                emit Result(gameId,winner,damage0,damage1);
      
            }
            if (tx.origin == Games[gameId].party0){
                
                Games[gameId].locked0 = false;
                INftcontract(nft).unlock(Games[gameId].tokenid0);
                ERC20I(damage).mintTo(tx.origin,Games[gameId].damage0*10**18);
            }
    
            if (tx.origin == Games[gameId].party1){
                Games[gameId].locked1 = false;
                INftcontract(nft).unlock(Games[gameId].tokenid1);
                ERC20I(damage).mintTo(tx.origin,Games[gameId].damage1*10**18);
            }
    
    
        } 
    
    
        
    
    
    }