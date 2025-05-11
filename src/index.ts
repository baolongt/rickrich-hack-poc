import {
    Connection,
    clusterApiUrl,
    PublicKey,
    Transaction,
    SystemProgram,
    TransactionSignature,
    Keypair
} from '@solana/web3.js';
import {
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import bs58 from 'bs58';

// Define network type
type NetworkType = 'mainnet-beta' | 'testnet' | 'devnet';

// Define wallet return type
interface WalletInfo {
    publicKey: string;
    secretKey: string;
    keypair: Keypair;
}

// Define transaction data return type
interface TransactionData {
    transaction: Buffer;
    signature: string;
    rawTransaction: Transaction;
}

// Define token mint addresses for different networks
const USDC_MINT = {
    'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'testnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Using devnet address for testnet too
    'devnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
};

// USDC has 6 decimals
const USDC_DECIMALS = 6;

/**
 * Solana Client for creating and managing transactions
 */
class SolanaClient {
    private network: NetworkType;
    private connection: Connection;

    /**
     * Create a new SolanaClient
     * @param network - 'mainnet-beta', 'testnet', or 'devnet'
     */
    constructor(network: NetworkType = 'devnet') {
        this.network = network;
        this.connection = new Connection(clusterApiUrl(network), 'confirmed');
    }

    /**
     * Change the network
     * @param network - 'mainnet-beta', 'testnet', or 'devnet'
     */
    setNetwork(network: NetworkType): void {
        this.network = network;
        this.connection = new Connection(clusterApiUrl(network), 'confirmed');
        console.log(`Network changed to ${network}`);
    }

    /**
     * Create a new wallet
     * @returns wallet object with keypair
     */
    createWallet(): WalletInfo {
        const wallet = Keypair.generate();
        return {
            publicKey: wallet.publicKey.toString(),
            secretKey: bs58.encode(wallet.secretKey),
            keypair: wallet
        };
    }

    /**
     * Load an existing wallet from secret key
     * @param secretKey - Base58 encoded secret key
     * @returns wallet object with keypair
     */
    loadWalletFromSecretKey(secretKey: string): WalletInfo {
        const decodedKey = bs58.decode(secretKey);
        const wallet = Keypair.fromSecretKey(decodedKey);
        return {
            publicKey: wallet.publicKey.toString(),
            secretKey: secretKey,
            keypair: wallet
        };
    }

    /**
     * Create and sign a transaction without submitting
     * @param wallet - Sender wallet
     * @param recipientAddress - Recipient public key
     * @param lamports - Amount in lamports
     * @returns transaction object with signature
     */
    async createAndSignTransaction(
        wallet: WalletInfo,
        recipientAddress: string,
        lamports: number
    ): Promise<TransactionData> {
        try {
            const recipientPubKey = new PublicKey(recipientAddress);

            // Create a transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: wallet.keypair.publicKey,
                    toPubkey: recipientPubKey,
                    lamports: lamports
                })
            );

            // Get a recent blockhash to include in the transaction
            const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.keypair.publicKey;

            // Sign the transaction
            transaction.sign(wallet.keypair);

            const signature = bs58.encode(transaction.signature!);
            const serializedTransaction = transaction.serialize();

            return {
                transaction: serializedTransaction,
                signature: signature,
                rawTransaction: transaction
            };
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }

    /**
     * Check signature with custom logic and submit if logic returns true
     * @param txData - Transaction data from createAndSignTransaction
     * @param logicFunction - Function that takes signature and returns boolean
     * @returns Transaction signature if submitted, null otherwise
     */
    async checkSignatureAndSubmit(
        txData: TransactionData,
    ): Promise<string | null> {
        try {
            // Apply custom logic to the signature



            // Submit the transaction
            const signature = await this.connection.sendRawTransaction(
                txData.transaction
            );

            console.log(`Transaction submitted. Signature: ${signature}`);
            return signature;

        } catch (error) {
            console.error('Error in checkSignatureAndSubmit:', error);
            throw error;
        }
    }

    /**
     * Get balance for an address
     * @param address - Wallet public key
     * @returns Balance in SOL
     */
    async getBalance(address: string): Promise<number> {
        try {
            const publicKey = new PublicKey(address);
            const balance = await this.connection.getBalance(publicKey);
            return balance / 1000000000; // Convert lamports to SOL
        } catch (error) {
            console.error('Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Get the current USDC mint address based on the network
     * @returns The USDC mint address for the current network
     */
    getUsdcMint(): string {
        return USDC_MINT[this.network];
    }

    /**
     * Create and sign a USDC token transfer transaction without submitting
     * @param wallet - Sender wallet
     * @param recipientAddress - Recipient public key
     * @param amount - Amount in USDC (e.g., 1.5 for 1.5 USDC)
     * @returns transaction object with signature
     */
    async createAndSignTokenTransaction(
        wallet: WalletInfo,
        recipientAddress: string,
        amount: number
    ): Promise<TransactionData> {
        try {
            const usdcMintAddress = this.getUsdcMint();
            const mintPublicKey = new PublicKey(usdcMintAddress);
            const recipientPublicKey = new PublicKey(recipientAddress);

            // Convert USDC amount to token amount (considering 6 decimals)
            const tokenAmount = Math.floor(amount * Math.pow(10, USDC_DECIMALS));

            // Get the associated token accounts for sender and recipient
            const senderTokenAccount = await getAssociatedTokenAddress(
                mintPublicKey,
                wallet.keypair.publicKey
            );

            const recipientTokenAccount = await getAssociatedTokenAddress(
                mintPublicKey,
                recipientPublicKey
            );

            // Create transaction
            const transaction = new Transaction();

            // Check if the recipient has an associated token account
            const recipientAccountInfo = await this.connection.getAccountInfo(recipientTokenAccount);

            // If recipient token account doesn't exist, create it first
            if (!recipientAccountInfo) {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        wallet.keypair.publicKey, // payer
                        recipientTokenAccount, // associated token account address
                        recipientPublicKey, // owner
                        mintPublicKey, // mint
                        TOKEN_PROGRAM_ID,
                        ASSOCIATED_TOKEN_PROGRAM_ID
                    )
                );
            }

            // Add the token transfer instruction
            transaction.add(
                createTransferInstruction(
                    senderTokenAccount, // source
                    recipientTokenAccount, // destination
                    wallet.keypair.publicKey, // owner
                    BigInt(tokenAmount), // amount
                    [], // multisigners
                    TOKEN_PROGRAM_ID
                )
            );

            // Get a recent blockhash to include in the transaction
            const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.keypair.publicKey;

            // Sign the transaction
            transaction.sign(wallet.keypair);

            const signature = bs58.encode(transaction.signature!);
            const serializedTransaction = transaction.serialize();

            return {
                transaction: serializedTransaction,
                signature: signature,
                rawTransaction: transaction
            };
        } catch (error) {
            console.error('Error creating token transaction:', error);
            throw error;
        }
    }

    /**
     * Get USDC balance for an address
     * @param address - Wallet public key
     * @returns Balance in USDC
     */
    async getTokenBalance(address: string): Promise<number> {
        try {
            const publicKey = new PublicKey(address);
            const mintPublicKey = new PublicKey(this.getUsdcMint());

            // Get the associated token account
            const tokenAccount = await getAssociatedTokenAddress(
                mintPublicKey,
                publicKey
            );

            try {
                const tokenAccountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
                return Number(tokenAccountInfo.value.amount) / Math.pow(10, USDC_DECIMALS);
            } catch (error) {
                // If the account doesn't exist or another error occurs, return 0
                return 0;
            }
        } catch (error) {
            console.error('Error getting token balance:', error);
            throw error;
        }
    }

    /**
     * Create and loop through transactions until one matches the custom logic
     * @param wallet - Sender wallet
     * @param recipientAddress - Recipient public key
     * @param amount - Amount to send (lamports for SOL, decimal amount for tokens)
     * @param logicFunction - Function that takes signature and returns boolean
     * @param isToken - Whether this is a token transaction (true) or SOL transaction (false)
     * @param maxAttempts - Maximum number of attempts before giving up
     * @returns Transaction data and signature if submitted successfully
     */
    async createUntilLogicMatches(
        wallet: WalletInfo,
        recipientAddress: string,
        amount: number,
        logicFunction: (signature: string) => boolean,
        isToken: boolean = false,
        maxAttempts: number = 100
    ): Promise<{ txData: TransactionData, signature: string | null }> {
        let attempts = 0;
        let txData: TransactionData;
        let shouldSubmit = false;

        console.log(`Starting to generate transactions until one matches the logic criteria...`);

        while (attempts < maxAttempts) {
            attempts++;

            // Create a new transaction each time
            try {
                if (isToken) {
                    txData = await this.createAndSignTokenTransaction(wallet, recipientAddress, amount);
                } else {
                    txData = await this.createAndSignTransaction(wallet, recipientAddress, amount);
                }

                console.log(`Attempt #${attempts}, Signature: ${txData.signature}`);

                // Check if this transaction's signature matches our criteria
                shouldSubmit = logicFunction(txData.signature);

                if (shouldSubmit) {
                    console.log(`Found matching signature after ${attempts} attempts!`);

                    // Submit the transaction
                    const signature = await this.connection.sendRawTransaction(
                        txData.transaction
                    );

                    console.log(`Transaction submitted. Signature: ${signature}`);
                    return { txData, signature };
                }

                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 10));

                // If we need a new blockhash to create a different signature, wait a bit longer
                if (attempts % 10 === 0) {
                    console.log(`Getting a new blockhash after ${attempts} attempts...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`Error on attempt ${attempts}:`, error);
                // Wait a bit longer if we hit an error
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`Gave up after ${maxAttempts} attempts.`);
        return { txData: txData!, signature: null };
    }
}

export default SolanaClient;