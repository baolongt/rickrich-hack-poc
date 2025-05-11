import SolanaClient from './index';

// Example usage of the Solana client
async function example(): Promise<void> {
    // Create a client connected to devnet
    const client = new SolanaClient('devnet');

    // Create a new wallet
    const wallet = client.loadWalletFromSecretKey("444k7wD5rjhg3o3rAcBddWsC3Ng2CxZJwYcV8FyGqsawJEx13WdS6HzLwTqVLR5dLszKNzBq776M7azpHjc22wsa")
    console.log('Created wallet:', wallet.publicKey);
    console.log('Secret key:', wallet.secretKey);

    // Example custom logic function - checks if signature starts with 'A'
    const customLogic = (signature: string): boolean => {
        console.log(`Checking signature: ${signature}`);
        return true
    };

    try {
        // Create and sign a transaction (this is just an example, it would fail without funding)
        const recipientAddress = '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri';
        const txData = await client.createAndSignTransaction(wallet, recipientAddress, 100000);

        console.log('Transaction created and signed');
        console.log('Signature:', txData.signature);

        // Check signature with custom logic and submit if it passes
        const txSignature = await client.checkSignatureAndSubmit(txData, customLogic);

        if (txSignature) {
            console.log('Transaction was submitted!');
        } else {
            console.log('Transaction was not submitted due to logic check');
        }

        // You can also switch networks
        client.setNetwork('testnet');

        // And load an existing wallet
        // const loadedWallet = client.loadWalletFromSecretKey('your-secret-key-here');

    } catch (error) {
        console.error('Error in example:', error);
    }
}

// Run the example
example().catch(console.error);