const express = require('express')
const ForwarderAbi = require('./src/abi/Forwarder.json')
const Forwarder = require('./src/deploy.json')
const ethers = require('ethers')
require('dotenv').config()

const stack = []
const MAX_GASLIMIT = 900000000
const TIME_INTERVAL = 60000

const app = express()
app.use(express.json())
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*') // update to match the domain you will make the request from
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.post('/relayTransaction', async (req, res) => {
  // setup to verify incoming signature and request
  const types = {
    ForwardRequest: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'gas', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
  }

  const domain = {
    name: 'Receiver',
    version: '1',
    chainId: 5,
    verifyingContract: Forwarder.verifyingContract,
  }

  const { request, signature } = req.body
  let gas = 0
  for (let i = 0; i < request.length; i++) {
    const verifiedAddress = ethers.utils.verifyTypedData(domain, types, request[i], signature[i])
    // Verify, that the message and the transaction are from the original signer else return error
    if (request[i].from !== verifiedAddress) {
      return res.status(400).send({
        message: 'The Transaction could not get verified.',
      })
    }
    gas += parseInt(request[0].gas)
  }

  const gasLimit = (parseInt(gas) + 50000).toString()
  if (gasLimit > MAX_GASLIMIT) {
    return res.status(400).send({
      message: 'Exceed maxmum gaslimit',
      maxGasLimit: MAX_GASLIMIT
    })
  }

  stack.push({ request, signature, gasLimit })

  return res.status(200).send({
    message: 'success',
  })
})

const doTransaction = async () => {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY)
  const provider = ethers.getDefaultProvider('https://goerli.infura.io/v3/' + process.env.INFURA_KEY)
  const connectedWallet = wallet.connect(provider)

  // send transaction to forwarder contract
  while(stack.length) {
    const obj = stack.shift()
    const forwarderContract = new ethers.Contract(Forwarder.verifyingContract, ForwarderAbi, connectedWallet)
    try{
        const contractTx = await forwarderContract.execute(obj.request, obj.signature, { gasLimit: obj.gasLimit })
        const transactionReceipt = await contractTx.wait()
        console.log(transactionReceipt)
    } catch(e) {
        continue;
    }
  }

  setTimeout(doTransaction, TIME_INTERVAL)
}

;(async function () {
  doTransaction()
})()

app.listen(4000, () => console.log('listening on port 4000!'))
