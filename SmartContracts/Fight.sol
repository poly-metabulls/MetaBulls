pragma solidity ^0.8.0;
pragma abicoder v2; // required to accept structs as function parameters

interface VNftcontract{
     function getData(uint256 tokenid) external view returns (uint256[10] memory);
    
}




contract FightGame {

struct move{
    uint damage;
    uint effect;
    bool kick;
}

mapping(uint=>move) moves;
constructor(){
    moves[0].damage = 100;
    moves[0].effect = 5;
    moves[0].kick = false;
    moves[1].damage = 110;
    moves[1].effect = 7;
    moves[1].kick = true;
    moves[2].damage = 90;
    moves[2].effect = 4;
    moves[2].kick = false;
    moves[3].damage = 95;
    moves[3].effect = 8;
    moves[3].kick = true;
    moves[4].damage = 130;
    moves[4].effect = 15;
    moves[4].kick = false;
    moves[5].damage = 111;
    moves[5].effect = 11;
    moves[5].kick = true;
    moves[6].damage = 80;
    moves[6].effect = 3;
    moves[6].kick = false;
    moves[7].damage = 100;
    moves[7].effect = 9;
    moves[7].kick = true;
}

function fightdeclare(uint256 tokenid0, uint256 tokenid1, address nft,uint startblock) external returns(bool,uint,uint){
    require(block.number > startblock+20,"Please recall");
    uint damage0 = 0;
    uint damage1 = 0;
    bool turn = false;
    uint256[10] memory data0 = VNftcontract(nft).getData(tokenid0);
    uint256[10] memory data1 = VNftcontract(nft).getData(tokenid1);

    for (uint j=startblock; j < startblock+20 ;j++ ){
        uint8 number = uint8(bytes32(blockhash(j))[15])%8;
        if(turn ==false ){
       
            if(moves[number].kick == false){
                
                if(data0[0]>moves[number].effect){
                damage0 += moves[number].damage+data0[0];
                data0[0]-=moves[number].effect;}
                else{
                    return (true,damage0,damage1);
                }
            }else{
                 if(data0[1]>moves[number].effect){
                damage0 += moves[number].damage+data0[1];
                data0[1]-=moves[number].effect;
                 }
                 else{
                      return (true,damage0,damage1);
                 }
            }
        }
        else{
           
            if(moves[number].kick == false){
                if(data1[0]>moves[number].effect){
                 damage1 += moves[number].damage+data1[0];
                data1[0]-=moves[number].effect;
                }
                else{
                     return (false,damage0,damage1);
                }
            }
            else{
                 if(data1[1]>moves[number].effect){
                damage1 += moves[number].damage+data1[1];
                data1[1]-=moves[number].effect;
                 }else{
                     return (false,damage0,damage1);
                 }
            }
        }
        
        turn = !turn;

    }
 
    if(damage0 > damage1){
         return (false,damage0,damage1);
    }
    else if (damage0 < damage1){
        return (true,damage0,damage1);
    }
    else{
        return(false,damage0,damage1);
    }



}
}