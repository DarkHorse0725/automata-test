import { ethers as eth } from "ethers";
import hre, { ethers } from "hardhat";

// import Wallet from 'ethereumjs-wallet'
import { expect } from "chai";
import { expectRevert, constants } from '@openzeppelin/test-helpers'

import * as dotenv from 'dotenv'
dotenv.config()

import config from '../scripts/data-config.json';
import ERC20 from '../build/contracts/contracts/TokenA.sol/TokenA.json'
import { getPermit } from "../src/helper";

const chain = 'goerli';
const name = config[chain].name;
const version = config[chain].version;

let forwarder
let Factory
let accounts: any[]
let tokenFactory;
let tokenContract;

describe("Optimizer", function () {
    beforeEach(async function () {
        Factory = await ethers.getContractFactory('Receiver')
        forwarder = await Factory.deploy(name, version)

        tokenFactory = await ethers.getContractFactory('TokenA')
        tokenContract = await tokenFactory.deploy("TokenA", "TA")

        accounts = await ethers.getSigners();

        const wallet = eth.Wallet.createRandom();
        this.wallet = new ethers.Wallet(wallet.privateKey, ethers.provider)
        await tokenContract.transfer(this.wallet.address, "1000000000000000000000")
        this.domain = {
          name,
          version,
          chainId: hre.network.config.chainId,
          verifyingContract: forwarder.address,
        };
        this.req = []
        this.sign = []
        this.types = {
          // EIP712Domain,
          ForwardRequest: [{
              name: 'from',
              type: 'address'
            },
            {
              name: 'to',
              type: 'address'
            },
            {
              name: 'value',
              type: 'uint256'
            },
            {
              name: 'gas',
              type: 'uint256'
            },
            {
              name: 'nonce',
              type: 'uint256'
            },
            {
              name: 'data',
              type: 'bytes'
            },
          ],
        };
      });
    
      context('with message', function () {
        beforeEach(async function () {
          this.sender = this.wallet.address;

          let iface = new eth.utils.Interface(ERC20.abi)
          let data = iface.encodeFunctionData("transferFrom", [this.sender, accounts[2].address, "1000000000000000000"])
          let req = {
            from: this.sender,
            to: tokenContract.address,
            value: '0',
            gas: '2100000',
            nonce: Number(await forwarder.getNonce(this.sender)),
            data: data,
          };
          let sign = await this.wallet._signTypedData(this.domain, this.types, req);
          this.req.push(req)
          this.sign.push(sign)

          const {signerAddress, spender, value, deadline, v, r, s} = await getPermit(this.wallet, tokenContract.address, forwarder.address, "100000000000000000000000")
          data = tokenContract.interface.encodeFunctionData("permit", [signerAddress, spender, value, deadline, v, r, s])
          // const data = "0x"
          req = {
            from: this.sender,
            to: tokenContract.address,
            value: '0',
            gas: '100000000',
            nonce:  Number(await forwarder.getNonce(this.sender))+1,
            data: data,
          };
          // const typedData = td.encode(this.req, 'ForwardRequest');
          sign = await this.wallet._signTypedData(this.domain, this.types, req);

          this.req.push(req)
          this.sign.push(sign)

          iface = new eth.utils.Interface(ERC20.abi)
          data = iface.encodeFunctionData("transferFrom", [this.sender, accounts[2].address, "1000000000000000000"])
          req = {
            from: this.sender,
            to: tokenContract.address,
            value: '0',
            gas: '210000',
            nonce: Number(await forwarder.getNonce(this.sender))+2,
            data: data,
          };
          sign = await this.wallet._signTypedData(this.domain, this.types, req);
          this.req.push(req)
          this.sign.push(sign)
        });    
        context('verify', function () {
          context('valid signature', function () {
            // beforeEach(async function () {
            //   expect(await forwarder.getNonce(this.req[0].from))
            //     .to.be.equal(ethers.BigNumber.from(this.req[0].nonce));
            // });
    
            it('success', async function () {
              expect(await forwarder.verify(this.req[0], this.sign[0])).to.be.equal(true);
            });
    
            // afterEach(async function () {
            //   expect(await forwarder.getNonce(this.req[0].from))
            //     .to.be.equal(ethers.BigNumber.from(this.req[0].nonce));
            // });
          });
        });
    
        context('execute', function () {
          context('valid signature', async function () {
            // beforeEach(async function () {
            //   expect(await forwarder.getNonce(this.req[0].from))
            //     .to.be.equal(ethers.BigNumber.from(this.req[0].nonce));
            //     console.log("-------------------before excute------------",await forwarder.getNonce(this.req[0].from))
            // });
            it('success', async function () {
              
              
              console.log('----balance----', await this.wallet.provider.getBalance(this.sender))
              console.log("---------before-----------",await tokenContract.balanceOf(this.sender), await tokenContract.balanceOf(accounts[2].address))
              await forwarder.execute(this.req, this.sign);
              // tx = await tx.wait()
              // console.log(tx.logs)
              console.log("---------after-----------",await tokenContract.balanceOf(this.sender), await tokenContract.balanceOf(accounts[2].address))
            });
            // afterEach(async function () {
            //   expect(await forwarder.getNonce(this.req.from))
            //     .to.be.equal(ethers.BigNumber.from(this.req.nonce + 1));
            //     console.log("-------------------after excute------------",await forwarder.getNonce(this.req.from))
            // });
          });
    
          context('value > ETH balance', function () {
            beforeEach(async function () {
              
            });
            it('failure', async function () {
              
            });
          });
        });
      });
});