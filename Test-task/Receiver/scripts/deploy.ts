import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'
import { writeFileSync } from 'fs'

async function main() {
  let factory = await ethers.getContractFactory('Receiver')

  // If we had constructor arguments, they would be passed into deploy()
  let contract = await factory.deploy("Receiver", "1")

  // The address the Contract WILL have once mined
  console.log("receiver address: ",contract.address)
  const verifyingContract = contract.address
  // The contract is NOT deployed yet; we must wait until it is mined
  await contract.deployed()

  factory = await ethers.getContractFactory('TokenA')
  contract = await factory.deploy('TestToken', 'PTT')

  console.log("Token Address:", contract.address)
  const TokenAddress = contract.address
  await contract.deployed()

  writeFileSync('../src/deploy.json', JSON.stringify({
    TokenAddress: TokenAddress,
    verifyingContract: verifyingContract
  }))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
