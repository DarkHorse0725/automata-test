# Getting Started with Meta_transaction

## Available Scripts

In the project directory, you can run:

### `yarn install`

This project consists of 3 parts: smart contract, express server, simple front-end. 

### 1. Compose to .env file.
- Rename `.env.example` file to `.env` file
- Fill in the blank in the .env file with your EOA private key and infura api_key.

### 2. Deploy smart contract to Goerli network

- `yarn deploy` and test token and receiver contract  will be deployed into Goerli network.
- The addresses of them will be generated into `./src/deploy.json` automatically. 

### 3. Running express server
- `yarn run-server` and server will run on localhost: port 4000
- Whenever server gets requests, it will save in stack and it will do transactions every 60s as default.

### 4. Running front-end
- `yarn start`
- Insert `to` address and `amount` in input field.
- You can do multi transfer using `add` button in front-end.
- You can reset multi transfer information.
- The transactions will be failed in front-end level if `to` addresses or input formats are not valid.

When you deploy contract using `yarn deploy`, New token will be generated and minted in your wallet address (associated with your Privatekey in `.env`)

You need to transfer this token to the other wallet address so that you can test meta-transaction.


