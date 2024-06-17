import {
    createSupply, creditMintTokensToUserAccount, generateNewWallet, getCurrentSupply, getOrCreateTokenAccount,
    getTokenBalance, getWalletFromMnemonic, transferTokens
} from "./app/wallet/wallet.service";
import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import {Connection} from "@solana/web3.js";

require('dotenv').config();

const app = express();
app.use(cors())
const PORT = process.env.PORT || 3000;
let connectionFailed = false;

const connection = new Connection("https://api.testnet.solana.com", "confirmed")


async function getBlockHeight() {
    try {
        const blockHeight = await connection.getBlockHeight();
        console.log("blockHeight: ", blockHeight);
        connectionFailed = false;
    } catch (e: any) {
        console.log("Error while connecting to the testnet", e);
        connectionFailed = true;
    }
}

getBlockHeight();
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

app.use(bodyParser.json())


app.post('/wallet/generate', async (req, res) => {
    if (connectionFailed) {
        res.status(500).send({
            error: "There was a problem while connecting to the testnet"
        })
    }
    const phrase = await generateNewWallet();
    res.status(200).send({
        status: "success",
        data: {
            phrase: phrase[0],
            pubKey: phrase[1]
        }
    });
})

app.post('/wallet/accounts/getorcreate', async (req, res) => {
    const body = req.body;
    const tokenAccount = await getOrCreateTokenAccount(body.publicKey);
    res.status(200).send(
        {
            status: "success",
            data: {
                tokenAccountPublicKey: tokenAccount.address
            }
        }
    )
})

app.post('/wallet/credit/account', async (req, res) => {
    const body = req.body;
    try {
        const signature = await creditMintTokensToUserAccount(res, body.tokenAccount, body.amount);
        res.status(200).send({
            status: "success",
            data: {
                signature: signature
            }
        })
    } catch (e: any | Error) {
        console.log(e);
        res.status(500).send({
            error: e.name + ": " + e.message
        })
    }

})


app.get('/wallet/pubkey/mnemonic', async (req, res) => {
    const body = req.body;
    try {
        const keypair = await getWalletFromMnemonic(body.mnemonic);
        res.status(200).send({
            status: "success",
            data: {
                publicKey: keypair.publicKey.toBase58()
            }
        })
    } catch (e: any | Error) {
        console.log(e);
        res.status(500).send({
            error: e.name + ": " + e.message
        })
    }
})

app.get('/wallet/token/balance', async (req, res) => {
    const body = req.body;
    const balances = await getTokenBalance(res, body.publicKey);

    res.status(200).send({
        status: "success",
        data: {
            balances: balances
        }
    })
})

app.get('/token/supply', async (req, res) => {
    const supply = await getCurrentSupply();
    console.log("supply", supply);
    res.status(200).send({
        status: "success",
        data: {
            supply: supply
        }
    })
})


app.post('/token/supply', async (req, res) => {
    const body = req.body;
    try {
        const signature = await createSupply(body.amount);
        const supply = await getCurrentSupply();
        res.status(200).send({
            status: "success",
            data: {
                supply: supply,
                signature: signature
            }
        })
    } catch (e: any | Error) {
        console.log(e);
        res.status(500).send({
            error: e.name + ": " + e.message
        })
    }

})


app.post('/token/transfer', async (req, res) => {
    const body = req.body;
    try {
        const signature = await transferTokens(res, body.payerMnemonic, body.payerTokenAccount,
            body.receiverTokenAccount, body.amount)
        res.status(200).send({
            signature: signature
        })
    } catch (e: any | Error) {
        console.log(e);
        res.status(500).send({
            error: e.name + ": " + e.message
        })
    }
})
