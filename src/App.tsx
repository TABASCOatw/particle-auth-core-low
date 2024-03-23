import React, { useState, useEffect } from 'react';
import { AvalancheTestnet } from '@particle-network/chains';
import { AAWrapProvider, SendTransactionMode, SmartAccount } from '@particle-network/aa';
import { particleAuth, thirdpartyAuth, connect } from '@particle-network/auth-core'
import { ethers } from 'ethers';
import { walletEntryPlugin } from '@particle-network/wallet'
import { notification } from 'antd';

import './App.css';

const App = () => {
  particleAuth.init({
    projectId: process.env.REACT_APP_PROJECT_ID!,
    clientKey: process.env.REACT_APP_CLIENT_KEY!,
    appId: process.env.REACT_APP_APP_ID!
  });

  walletEntryPlugin.init({
    projectId: process.env.REACT_APP_PROJECT_ID!,
    clientKey: process.env.REACT_APP_CLIENT_KEY!,
    appId: process.env.REACT_APP_APP_ID!,
  }, {
    erc4337: {
      name: "SIMPLE",
      version: "1.0.0"
    }
  });

  const [balance, setBalance] = useState(null);
  const [address, setAddress] = useState(null);

  const smartAccount = new SmartAccount(particleAuth.ethereum, {
    projectId: process.env.REACT_APP_PROJECT_ID,
    clientKey: process.env.REACT_APP_CLIENT_KEY,
    appId: process.env.REACT_APP_APP_ID,
    aaOptions: {
      accountContracts: {
        SIMPLE: [{ chainIds: [AvalancheTestnet.id], version: '1.0.0' }],
      }
    }
  });

  useEffect(() => {
    walletEntryPlugin.setWalletCore({
      ethereum: smartAccount.provider,
    });
    
    walletEntryPlugin.walletEntryCreate();
  }, [smartAccount]);

  const customProvider = new ethers.providers.Web3Provider(new AAWrapProvider(smartAccount, SendTransactionMode.Gasless), "any");

  useEffect(() => {
    if (address) {
      fetchBalance();
    }
  }, [address]);

  useEffect(() => {
    const handleAuthRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const encodedParams = urlParams.get('particleThirdpartyParams');

      if (encodedParams) {
          const base64DecodedParams = atob(encodedParams);
          const paramsObj = JSON.parse(base64DecodedParams);

          const code = paramsObj.code;
          const nonce = paramsObj.nonce;

          const socialType = localStorage.getItem('socialType');

          await connect({
            socialType,
            chain: AvalancheTestnet,
            code,
            nonce
          });

          setAddress(await smartAccount.getAddress());

          window.history.pushState({}, document.title, window.location.pathname);
        }
    };

    handleAuthRedirect();
  }, []);


  const fetchBalance = async () => {
    const address = await smartAccount.getAddress();
    const balanceResponse = await customProvider.getBalance(address);
    setBalance(ethers.utils.formatEther(balanceResponse));
  };

  const handleLogin = async (socialType) => {
    localStorage.setItem('socialType', socialType);
    await thirdpartyAuth({ authType: socialType });
  };


  const executeUserOp = async () => {
    notification.info({
      message: "Sending transaction..."
    })
    const signer = customProvider.getSigner();

    const tx = {
      to: "0x000000000000000000000000000000000000dEaD",
      value: ethers.utils.parseEther('0.001')
    };

    const txResponse = await signer.sendTransaction(tx);
    const txReceipt = await txResponse.wait();

    notification.success({
      message: "Transaction Successful",
      description: (
        <div>
          Transaction Hash: <a href={`https://testnet.snowtrace.io/tx/${txReceipt.transactionHash}`} target="_blank" rel="noopener noreferrer">{txReceipt.transactionHash}</a>
        </div>
      )
    });
  };

  return (
    <div className="App">
      <div className="logo-section">
        <img src="https://i.imgur.com/EerK7MS.png" alt="Logo 1" className="logo logo-big" />
        <img src="https://i.imgur.com/4AAHtZg.png" alt="Logo 2" className="logo" />
      </div>
      {!address ? (
        <div className="login-section">
          <button className="sign-button google-button" onClick={() => handleLogin('google')}>
            <img src="https://i.imgur.com/nIN9P4A.png" alt="Google" className="icon"/>
            Sign in with Google
          </button>
          <button className="sign-button twitter-button" onClick={() => handleLogin('twitter')}>
            <img src="https://i.imgur.com/afIaQJC.png" alt="Twitter" className="icon"/>
            Sign in with X
          </button>
        </div>
      ) : (
        <div className="profile-card">
          <h6>{address}</h6>
          <div className="balance-section">
            <small>{balance} AVAX</small>
            <button className="sign-message-button" onClick={executeUserOp}>Execute Transaction</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
