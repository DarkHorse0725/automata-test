import React, { useState, useContext, useMemo, useCallback, ReactElement } from "react";
// import Web3Modal from "web3modal";
import { StaticJsonRpcProvider, JsonRpcProvider, Web3Provider, } from "@ethersproject/providers";
// import WalletConnectProvider from "@walletconnect/web3-provider";

function getTestnetURI() {
  return 'https://goerli.infura.io/v3/' + process.env.INFURA_KEY;
}

function getMainnetURI() {
  return 'https://mainnet.infura.io/v3/' + process.env.INFURA_KEY;
}

type onChainProvider = {
  connect: () => void;
  disconnect: () => void;
  provider: JsonRpcProvider;
  address: string;
  connected: boolean;
  // web3Modal: Web3Modal;
  chainID: number
};

declare var window: any

export type Web3ContextData = {
  onChainProvider: onChainProvider;
} | null;

const Web3Context = React.createContext<Web3ContextData>(null);

export const useWeb3Context = () => {
  const web3Context = useContext(Web3Context);
  if (!web3Context) {
    throw new Error(
      "useWeb3Context() can only be used inside of <Web3ContextProvider />, " + "please declare it at a higher level.",
    );
  }
  const { onChainProvider } = web3Context;
  return useMemo(() => {
    return { ...onChainProvider };
  }, [web3Context]);
};

// define useAddress() hook
export const useAddress = () => {
  const { address } = useWeb3Context();
  return address;
};

export const Web3ContextProvider: React.FC<{ children: ReactElement }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [chainID, setChainID] = useState(43113);
  const [address, setAddress] = useState("");

  const [uri, setUri] = useState(getTestnetURI());

  const [provider, setProvider] = useState(new StaticJsonRpcProvider(uri));

  const _initListeners = useCallback(
    (rawProvider: any) => {
      if (!rawProvider.on) {
        return;
      }
      // when wallet account is changed
      rawProvider.on("accountsChanged", async (accounts: string[]) => {
        setTimeout(() => window.location.reload(), 1);
      });
      // when chainId is changed
      rawProvider.on("chainChanged", async (chain: number) => {
        _checkNetwork(chain);
        setTimeout(() => window.location.reload(), 1);
      });

      rawProvider.on("network", (_newNetwork: any, oldNetwork: any) => {
        if (!oldNetwork) return;
        window.location.reload();
      });
    },
    [provider],
  );

  const _checkNetwork = (otherChainID: number) => {
    console.log(otherChainID)
    // when chainID is not test-Avax, it will return false and processes are halt.
    if (chainID !== otherChainID) {
      if (otherChainID === 5) {
        setChainID(otherChainID);
        setUri(getTestnetURI())
        return true;
      }
      return false;
    }
    return true;
  };

  // connect - only runs for WalletProviders
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("install metamask")
      return;
    }
  
    // const rawProvider = await web3Modal.connect();
    // await web3Modal.toggleModal();
    // const connectedProvider = new ethers.providers.Web3Provider(window.ethereum, "any");
    _initListeners(window.ethereum);
    const connectedProvider = new Web3Provider(window.ethereum, "any");

    const chainId = await connectedProvider.getNetwork().then(network => network.chainId);
    const connectedAddress = await connectedProvider.send("eth_requestAccounts", []);
    // const connectedAddress = await connectedProvider.getSigner().getAddress();
    const validNetwork = _checkNetwork(chainId);
    if (!validNetwork) {
      console.error("Wrong network, please switch to bsc mainnet");
      return;
    }
    
    setAddress(connectedAddress[0]);
    setProvider(connectedProvider);
    setConnected(true);

    return connectedProvider;
  }, [provider, connected]);

  const disconnect = useCallback(async () => {
    console.log("disconnecting");
    setConnected(false);

    setTimeout(() => {
      window.location.reload();
    }, 1);
  }, [provider, connected]);

  const onChainProvider = useMemo(
    () => ({ connect, disconnect, provider, connected, address, chainID }),
    [connect, disconnect, provider, connected, address, chainID],
  );

  return <Web3Context.Provider value={{ onChainProvider }}>{children}</Web3Context.Provider>;
};
