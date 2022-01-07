const axios = require('axios')
const Web3 = require('web3');
const fs = require('fs')

var WSWEB3 = 'ws://localhost:8585'
var web3 = new Web3(Web3.givenProvider || WSWEB3);

const timer = ms => new Promise(res => setTimeout(res, ms))


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

    // var lastStartingTime = Math.floor(new Date().getTime() / 1000)

    await web3.eth.subscribe('newBlockHeaders', async function(error, header){
        console.log(header)
        if (!error) {

                    var blockMiner
                // while ((Math.floor(new Date().getTime() / 1000))-lastStartingTime <= 600){
                    console.log('Number:', header.number);
                    console.log('Hash:', header.hash);
                    console.log('Difficulty:', header.difficulty);
                    console.log('Parent Hash:', header.parentHash);
                    console.log('Timestamp:', header.timestamp);
                    console.log('Gas Used:', header.gasUsed);
                // }

                await axios.post('http://localhost:8545', {
                        jsonrpc: '2.0',
                        method: 'bor_getAuthorByHash',
                        params: [header.hash],
                        id: 1
                    }, {
                        headers: {
                        'Content-Type': 'application/json',
                        },
                    }).then((response) => {
                        blockMiner = response.data.result
                        // console.log('Author:', response.data.result);
                        // console.log();
                })

                var blockS = {
                    blockNumber : header.number,
                    timestamp : header.timestamp,
                    txCount : header.transactions.length,
                    blockMiner : blockMiner,
                }

                console.log(blockS)


            }
        }
    )

}

main()