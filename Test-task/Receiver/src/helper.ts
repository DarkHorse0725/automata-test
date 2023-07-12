import { ethers } from 'ethers'
import { signERC2612Permit } from 'eth-permit'
import ERC20 from './ABI/ERC20_Permit.json'
import Forwarder from './ABI/Forwarder.json'
import Config from "./deploy.json"
import { JsonRpcSigner } from '@ethersproject/providers'

interface Request {
  from: string
  to: string
  value: string
  nonce: string | number
  gas: string
  data: string
}

export const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

const domain = {
  name: 'Receiver',
  version: '1',
  chainId: 5,
  verifyingContract: Config.verifyingContract,
};
const types = {
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

export const getPermit = async (signerWallet: JsonRpcSigner, token: string, spender: string, value: string) => {
  const signerAddress = await signerWallet.getAddress()
  const allowanceParameters = await signERC2612Permit(signerWallet, token, signerAddress, spender, value)
  return {
    signerAddress,
    spender,
    value,
    deadline: allowanceParameters.deadline,
    v: allowanceParameters.v,
    r: allowanceParameters.r,
    s: allowanceParameters.s,
  }
}

export const generateSignAndRequest = async (provider: ethers.providers.JsonRpcProvider, token: string, transferInfo: { address: string, amount: string }[]) => {
  let totalApprove = 0
  const tInfo = transferInfo.filter(each=>{
    if(each.address && each.amount && !Number.isNaN(each.amount) && ethers.utils.isAddress(each.address)) {
      totalApprove += Number(each.amount)
      return true;
    }
  })
  const signList: string[] = []
  const reqList: Request[] = []
  const from = await provider.getSigner().getAddress()
  const fowarderContract = new ethers.Contract(
    Config.verifyingContract,
    Forwarder,
    provider.getSigner()
  );
  const { signerAddress, spender, value, deadline, v, r, s } = await getPermit(
    provider.getSigner(),
    token,
    Config.verifyingContract,
    ethers.utils.parseEther(totalApprove.toString()).toString(),
  )
  let iface = new ethers.utils.Interface(ERC20)
  let data = iface.encodeFunctionData('permit', [signerAddress, spender, value, deadline, v, r, s])
  let req: Request = {
    from: from,
    to: token,
    value: '0',
    gas: '210000',
    nonce: Number(await fowarderContract.getNonce(from)),
    data: data,
  }
  console.log(req)
  let sign = await provider.getSigner()._signTypedData(domain, types, req)

  reqList.push(req)
  signList.push(sign)
  console.log(reqList, signList)

  iface = new ethers.utils.Interface(ERC20)
  for(let i = 0; i < tInfo.length; i++) {
    data = iface.encodeFunctionData('transferFrom', [from, tInfo[i].address, ethers.utils.parseEther(tInfo[i].amount).toString()])
    req = {
      from: from,
      to: token,
      value: '0',
      gas: '210000',
      nonce: Number(await fowarderContract.getNonce(from)) + 1 + i,
      data: data,
    }
    sign = await provider.getSigner()._signTypedData(domain, types, req)
    reqList.push(req)
    signList.push(sign)
  }
  return {reqList, signList}
}
