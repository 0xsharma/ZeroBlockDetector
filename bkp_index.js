const axios = require('axios')
const Web3 = require('web3');
const fs = require('fs')

var WSWEB3 = 'wss://polygon-mainnet.g.alchemy.com/v2/sstrrWqziLhH3KWlbOYheMVQgrnqtLrQ'
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
            gas : block.gasUsed,
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
    var APIKEY = 'B6B5CR6BDBSYFRQA177D8F83WEK2H796MF'
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
    while ((Math.floor(new Date().getTime() / 1000))-lastStartingTime <= 600){
        var blockS = await getBlockTxCount(lastStartingTime)
        if(blockS!==undefined){

            if(validatorsLegacy[blockS.blockMiner]===undefined){
                
                var blockMinerDetails = {
                    totalBlockCount : 0,
                    emptyBlocksCount : 0,
                    minGas : 9999999999999,
                    maxGas : 0,
                    avgGas : 0,
                }

                totalBlocks +=1
                blockMinerDetails.totalBlockCount += 1
                
                if(blockS.txCount===0){ 
                    totalEmptyBlocks+=1
                    blockMinerDetails.emptyBlocksCount +=1
                }else{
                    var nonEmptyBlocks = blockMinerDetails.totalBlockCount-blockMinerDetails.emptyBlocksCount
                    blockMinerDetails.avgGas = (blockMinerDetails.avgGas*(nonEmptyBlocks-1) + blockS.gas)/nonEmptyBlocks
                    if(blockS.gas>blockMinerDetails.maxGas){
                        blockMinerDetails.maxGas = blockS.gas
                    }
                    if(blockS.gas<blockMinerDetails.minGas){
                        blockMinerDetails.minGas = blockS.gas
                    }
                }
                validatorsLegacy[blockS.blockMiner] = blockMinerDetails

            }else{

                totalBlocks+=1
                validatorsLegacy[blockS.blockMiner].totalBlockCount += 1
                if(blockS.txCount===0){
                    totalEmptyBlocks+=1
                    validatorsLegacy[blockS.blockMiner].emptyBlocksCount +=1
                }else{
                    var nonEmptyBlocks = validatorsLegacy[blockS.blockMiner].totalBlockCount-validatorsLegacy[blockS.blockMiner].emptyBlocksCount
                    validatorsLegacy[blockS.blockMiner].avgGas = (validatorsLegacy[blockS.blockMiner].avgGas*(nonEmptyBlocks-1) +blockS.gas)/nonEmptyBlocks
                    if(blockS.gas>validatorsLegacy[blockS.blockMiner].maxGas){
                        validatorsLegacy[blockS.blockMiner].maxGas = blockS.gas
                    }
                    if(blockS.gas<validatorsLegacy[blockS.blockMiner].minGas){
                        validatorsLegacy[blockS.blockMiner].minGas = blockS.gas
                    }
                }
            }

            if(validators[blockS.blockMiner]===undefined){

                var blockMinerDetails = {
                    totalBlockCount : 0,
                    emptyBlocksCount : 0,
                    minGas : 9999999999999,
                    maxGas : 0,
                    avgGas : 0,
                }

                totalBlocksPerIteration += 1
                blockMinerDetails.totalBlockCount += 1
                if(blockS.txCount===0){
                    totalEmptyBlocksPerIteration += 1
                    blockMinerDetails.emptyBlocksCount +=1
                }else{
                    var nonEmptyBlocks = blockMinerDetails.totalBlockCount-blockMinerDetails.emptyBlocksCount
                    blockMinerDetails.avgGas = (blockMinerDetails.avgGas*(nonEmptyBlocks-1) +blockS.gas)/nonEmptyBlocks
                    if(blockS.gas>blockMinerDetails.maxGas){
                        blockMinerDetails.maxGas = blockS.gas
                    }
                    if(blockS.gas<blockMinerDetails.minGas){
                        blockMinerDetails.minGas = blockS.gas
                    }
                }
                validators[blockS.blockMiner] = blockMinerDetails

            }else{

                totalBlocksPerIteration += 1
                validators[blockS.blockMiner].totalBlockCount += 1
                if(blockS.txCount===0){
                    totalEmptyBlocksPerIteration += 1
                    validators[blockS.blockMiner].emptyBlocksCount +=1
                }else{
                    var nonEmptyBlocks = validators[blockS.blockMiner].totalBlockCount-validators[blockS.blockMiner].emptyBlocksCount
                    validators[blockS.blockMiner].avgGas = (validators[blockS.blockMiner].avgGas*(nonEmptyBlocks-1) +blockS.gas)/nonEmptyBlocks
                    if(blockS.gas>validators[blockS.blockMiner].maxGas){
                        validators[blockS.blockMiner].maxGas = blockS.gas
                    }
                    if(blockS.gas<validators[blockS.blockMiner].minGas){
                        validators[blockS.blockMiner].minGas = blockS.gas
                    }
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