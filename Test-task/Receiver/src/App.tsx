import React, { useState, useEffect } from "react";
import { Box, Button, Paper, TextField } from "@mui/material";
import "./App.css";
import { useWeb3Context } from "./web3Context";
import axios from "axios";
import _ from 'lodash'
import { ethers } from 'ethers'
import Config from "./deploy.json"
import ERC20 from "./ABI/ERC20_Permit.json"
import { generateSignAndRequest } from "./helper";

function App() {
  const { connect, address, disconnect, provider } = useWeb3Context();
  const [transferInfo, setTransferInfo] = useState([{ address: "", amount: "" }]);
  const [userAmount, setUserAmount] = useState(0)

  useEffect(()=>{loadUserTokenInfo()},[address])

  const loadUserTokenInfo = async () => {
    const tokenContract = new ethers.Contract(
      Config.TokenAddress,
      ERC20,
      provider.getSigner()
    );
    setUserAmount(await tokenContract.balanceOf(address))
  }

  const addTransferInfo = () => {
    const tmp = [...transferInfo];
    tmp.push({ address: "", amount: "" })
    setTransferInfo(tmp)
  }

  const resetTransferInfo = () => {
    setTransferInfo([{ address: "", amount: "" }])
  }

  const onChangeTransferInfo = (index: number, _key: string) => (e: any) => {
    const tmp = [...transferInfo];
    _.set(tmp, [index, _key], e.target.value)
    setTransferInfo(tmp)
  }

  const send = async() => {
    const {reqList, signList} = await generateSignAndRequest(provider, Config.TokenAddress, transferInfo)
    console.log(reqList, signList)
    try{
      const { data } = await axios.post(
        `http://localhost:4000/relayTransaction`,
        {
          request: reqList,
          signature: signList
        }
      );
      alert("please wait for a min...")
    } catch(e: any) {
      alert(e.message)
      console.log(e)
    }
    

  }

  return (
    <div className="App">
      <Box display="flex" flexDirection="column">
        <Box display="flex" justifyContent="space-between" px="50px" py="10px" bgcolor="#1d2230">
          <Box display="flex" justifyContent="center" alignItems="center" color="#ddd">
            <Box component={"h1"} textAlign="left">
              Meta transaction
            </Box>
          </Box>
          <Box display="flex" justifyContent="center" alignItems="center">
            {!address && (
              <Button variant="contained" onClick={connect}>
                Connect Wallet
              </Button>
            )}
            {address && (
              <Button variant="contained" onClick={disconnect}>
                {address.substring(0, 5) + "..." + address.substring(address.length - 5)}
              </Button>
            )}
          </Box>
        </Box>
        <Box display="flex" justifyContent="center" alignItems={"center"} width="100%" height="100%" py="50px">
          <Paper elevation={3} sx={{ p: "20px", display: "flex", flexDirection: "column" }}>
            <>
              <Box component="h3" pb="10px">Transfer Tokens</Box>
              <Box py="10px" width="100%" textAlign="right">Token Amount: {ethers.utils.formatEther(userAmount)}</Box>
              <Box display="flex" flexDirection='column' gap="10px">
              {transferInfo.map((each, index) => {
                return <Box display='flex' gap='10px' key={index}>
                  <TextField variant="outlined" label="To" value={each.address} onChange={onChangeTransferInfo(index, "address")} />
                  <TextField variant="outlined" label="Amount" value={each.amount} onChange={onChangeTransferInfo(index, "amount")} />
                </Box>
              })}
              </Box>
              <Box display='flex' gap="20px" pt="20px" justifyContent={'center'}>
                <Button variant="outlined" onClick={addTransferInfo}>Add</Button>
                <Button variant="outlined" color="warning" onClick={resetTransferInfo} >Reset</Button>
                <Button variant="contained" onClick={send}>Send</Button>
              </Box>
            </>
          </Paper>
        </Box>
      </Box>
    </div>
  );
}

export default App;
