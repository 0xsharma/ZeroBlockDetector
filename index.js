const axios = require('axios')
const Web3 = require('web3');
const fs = require('fs')

var WSWEB3 = WEB3_WEBSOCKET_URL
var web3 = new Web3(Web3.givenProvider || WSWEB3);

const timer = ms => new Promise(res => setTimeout(res, ms))

var lastBlockNum = 0

async function getBlockTxCount(lastStartingTime){

    var blockNum = await web3.eth.getBlockNumber()-200
    if(lastBlockNum!==blockNum){
        lastBlockNum = blockNum
        var block = await web3.eth.getBlock(blockNum)
        var blockMiner = await getBlockValidator(blockNum)
        console.log(blockMiner)
        console.log(blockNum , " : ",block.transactions.length)

        var blockS = {
            blockNumber : blockNum,
            timestamp : block.timestamp,
            txCount : block.transactions.length,
            blockMiner : blockMiner,
        }
    
        fs.appendFile(`./out-${lastStartingTime}.json`, '\n'+JSON.stringify(blockS) , function (err) {
            if (err) throw err;
            console.log('Added', JSON.stringify(blockS));
         });

         return blockS
    } 
}

async function getBlockValidator(blockNum){
    var blockMiner
    var APIKEY = POLYGONSCAN-API-KEY
    await axios.post(`https://api.polygonscan.com/api?module=block&action=getblockreward&blockno=${blockNum}&apikey=${APIKEY}`,{})
    .then((response)=>{
        blockMiner = response.data.result.blockMiner
        // return response.data.result.blockMiner
    })
    return blockMiner
}

var validatorsLegacy = {}
var totalBlocks = 0
var totalEmptyBlocks = 0

async function iteration(lastStartingTime){
    var validators = {}
    var totalBlocksPerIteration = 0
    var totalEmptyBlocksPerIteration = 0
    while ((Math.floor(new Date().getTime() / 1000))-lastStartingTime <= 60){
        var blockS = await getBlockTxCount(lastStartingTime)
        if(blockS!==undefined){

            if(validatorsLegacy[blockS.blockMiner]===undefined){
                
                var blockMinerDetails = {
                    totalBlockCount : 0,
                    emptyBlocksCount : 0
                }
                totalBlocks +=1
                blockMinerDetails.totalBlockCount += 1
                if(blockS.txCount===0){ 
                    totalEmptyBlocks+=1
                    blockMinerDetails.emptyBlocksCount +=1
                }
                validatorsLegacy[blockS.blockMiner] = blockMinerDetails

            }else{

                totalBlocks+=1
                validatorsLegacy[blockS.blockMiner].totalBlockCount += 1
                if(blockS.txCount===0){
                    totalEmptyBlocks+=1
                    validatorsLegacy[blockS.blockMiner].emptyBlocksCount +=1
                }

            }

            if(validators[blockS.blockMiner]===undefined){

                var blockMinerDetails = {
                    totalBlockCount : 0,
                    emptyBlocksCount : 0
                }
                totalBlocksPerIteration += 1
                blockMinerDetails.totalBlockCount += 1
                if(blockS.txCount===0){
                    totalEmptyBlocksPerIteration += 1
                    blockMinerDetails.emptyBlocksCount +=1
                }
                validators[blockS.blockMiner] = blockMinerDetails

            }else{

                totalBlocksPerIteration += 1
                validators[blockS.blockMiner].totalBlockCount += 1
                if(blockS.txCount===0){
                    totalEmptyBlocksPerIteration += 1
                    validators[blockS.blockMiner].emptyBlocksCount +=1
                }

            }
        }
        

        await timer(300)
    }

    fs.appendFile(`./out-${lastStartingTime}.json`, `\n\nSUMMARY :
    \nTOTAL BLOCK IN THIS ITERATION : ` + totalBlocksPerIteration +
    `\nTOTAL EMPTY BLOCK IN THIS ITERATION : ` + totalEmptyBlocksPerIteration + '\n\n' 
    +JSON.stringify(validators) , function (err) {
        if (err) throw err;
        console.log('Added Summary');
     });

    fs.appendFile(`./summaries.json`, `\n\nSUMMARY FOR ./out-${lastStartingTime}.json :
    \nTOTAL BLOCK IN THIS ITERATION : ` + totalBlocksPerIteration +
    `\nTOTAL EMPTY BLOCK IN THIS ITERATION : ` + totalEmptyBlocksPerIteration + '\n\n' 
    +JSON.stringify(validators) + '\n-----------' , function (err) {
        if (err) throw err;
        // console.log('Added Summary');
    });

    fs.writeFile(`./conciseSummary.json`, `\n\nSUMMARY :
    \nTOTAL BLOCKS : ` + totalBlocks +
    `\nTOTAL EMPTY BLOCKS : ` + totalEmptyBlocks + '\n\n' 
    +JSON.stringify(validatorsLegacy) + '\n-----------' , function (err) {
        if (err) throw err;
        // console.log('Added Summary');
    });

    return
}

async function main(){

    var lastStartingTime = Math.floor(new Date().getTime() / 1000)

    while(true){
        await iteration(lastStartingTime)
        lastStartingTime = Math.floor(new Date().getTime() / 1000)
    }

    
}

main()