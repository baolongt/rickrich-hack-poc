import {
    Connection,
    clusterApiUrl,
    PublicKey,
    Transaction,
    SystemProgram,
    TransactionSignature,
    Keypair
} from '@solana/web3.js';
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
        logicFunction: (signature: string) => boolean
    ): Promise<string | null> {
        try {
            // Apply custom logic to the signature
            const shouldSubmit = logicFunction(txData.signature);

            if (shouldSubmit) {
                // Submit the transaction
                const signature = await this.connection.sendRawTransaction(
                    txData.transaction
                );

                console.log(`Transaction submitted. Signature: ${signature}`);
                return signature;
            } else {
                console.log('Transaction not submitted due to logic check');
                return null;
            }
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
}

export default SolanaClient;