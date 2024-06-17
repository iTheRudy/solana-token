import * as bip39 from "bip39";
import {clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {
    AccountLayout, getAccount, getMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID, transfer
} from "@solana/spl-token";
import {Response} from "express";

require('dotenv').config();
const connection = new Connection(clusterApiUrl("testnet"), "confirmed")
// @ts-ignore
const mintString: string = process.env.MINT;
// @ts-ignore
const mintTokenAccountAddressString: string = process.env.MINT_TOKEN_ACCOUNT_ADDRESS
// @ts-ignore
const payerMnemonic: string = process.env.PAYER_MNEMONIC
// @ts-ignore
const mintAuthorityMnemonic: string = process.env.MINT_AUTHORITY_MNEMONIC
// @ts-ignore
const freezeAuthorityMnemonic: string = process.env.FREEZE_AUTHORITY_MNEMONIC
const mint = new PublicKey(mintString)
const mintTokenAccountAddress = new PublicKey(mintTokenAccountAddressString)
export const generateNewWallet = async () => {
    const mnemonic = generateMnemonic();
    console.log(mnemonic);
    const seed = await bip39.mnemonicToSeed(mnemonic);
    console.log("seed = ", seed)
    const keypair = await Keypair.fromSeed(new Uint8Array(seed).slice(0, 32));
    console.log("keypair: ", keypair);
    return [mnemonic, keypair.publicKey.toBase58()];
}

export const getWalletFromMnemonic = async (mnemonic: string) => {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const keypair = await Keypair.fromSeed(new Uint8Array(seed).slice(0, 32));
    return keypair;
}

export const getOrCreateTokenAccount = async (pubKey: string) => {
    const publicKey = new PublicKey(pubKey)
    const payer = await getWalletFromMnemonic(payerMnemonic)
    const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, publicKey);
    return tokenAccount;
}

export const creditMintTokensToUserAccount = async (res: Response, tokenAccount: string, amount: number) => {
    const tokenAccountAddress = new PublicKey(tokenAccount)
    const payer = await getWalletFromMnemonic(payerMnemonic)
    const mintAuthority = await getWalletFromMnemonic(mintAuthorityMnemonic);
    const userAccount = await getAccount(connection, tokenAccountAddress)
    if (!userAccount) {
        res.status(404).send({
            error: `Could not find an associated token account with address ${tokenAccount}`
        })
    }
    const signature = await transfer(
        connection,
        payer,
        mintTokenAccountAddress,
        tokenAccountAddress,
        mintAuthority.publicKey,
        amount * LAMPORTS_PER_SOL
    );
    return signature;
}

export const getTokenBalance = async (res: Response, pubKey: string) => {
    const publicKey = new PublicKey(pubKey);
    console.log(publicKey);
    const tokenAccounts = await connection.getTokenAccountsByOwner(
       publicKey,
        {
            programId: TOKEN_PROGRAM_ID
        }
    );
    if (!tokenAccounts || tokenAccounts === null) {
        res.status(404).send({
            error: `Could not find an account with publicKey ${pubKey}`,
        })
    }
    let balances = new Array<any>();
    tokenAccounts.value.forEach((tokenAccount) => {
        const accountData = AccountLayout.decode(tokenAccount.account.data);
        console.log("tokenAccount", tokenAccount)
        let amount = accountData.amount;
        amount = amount / BigInt(LAMPORTS_PER_SOL);
        balances.push({
            mint: accountData.mint,
            amount: Number(amount)
        })
        console.log(`${new PublicKey(accountData.mint)}   ${amount}`);
    })
    return balances;
}

export const getCurrentSupply = async () => {
    const mintToken = await getMint(connection, mint, "confirmed")
    let supply = mintToken.supply;
    const result = mintToken.supply / BigInt(LAMPORTS_PER_SOL);
    return Number(result);
}
export const generateMnemonic = () => {
    return bip39.generateMnemonic(128);
}

export const createSupply = async (amount: number) => {

    const payer = await getWalletFromMnemonic(payerMnemonic)
    const mintAuthority = await getWalletFromMnemonic(mintAuthorityMnemonic);
    const supplySignature = await mintTo(connection, payer, mint, mintTokenAccountAddress, mintAuthority,
        amount * LAMPORTS_PER_SOL);
    return supplySignature;

}


export const transferTokens = async (res: Response, payerMnemonic: string, payerTokenAccountAddressString: string,   receiverTokenAccountAddressString: string, amount: number) => {
    const receiverTokenAccountAddress = new PublicKey(receiverTokenAccountAddressString)
    const payerAccount = await getWalletFromMnemonic(payerMnemonic)
    const mintAuthority = await getWalletFromMnemonic(mintAuthorityMnemonic);
    const payerTokenAccountAddress = new PublicKey(payerTokenAccountAddressString);
    const payerTokenAccount = await getAccount(connection, payerTokenAccountAddress)
    const receiverTokenAccount = await getAccount(connection, receiverTokenAccountAddress)
    if (!receiverTokenAccount) {
        res.status(404).send({
            error: `Could not find an associated token account with address ${receiverTokenAccountAddressString}`
        })
    }

    console.log("payerAccount: ", payerAccount.publicKey);
    console.log("payerTokenAccount.owner", payerTokenAccount.owner);
    const signature = await transfer(
        connection,
        payerAccount,
        payerTokenAccountAddress,
        receiverTokenAccountAddress,
        payerAccount.publicKey,
        amount * LAMPORTS_PER_SOL
    );
    return signature;
}
