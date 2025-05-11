import SolanaClient from './index';

// Example usage of the Solana client
async function example(): Promise<void> {
    // Create a client connected to devnet
    const client = new SolanaClient('mainnet-beta');
    console.log('Connected to network:', client.getUsdcMint());

    // Create a new wallet
    // TODO: change this if you want to load a wallet from a secret key
    // const wallet = client.loadWalletFromSecretKey();
    const wallet = client.createWallet();
    console.log('Created wallet:', wallet.publicKey);
    console.log('Created wallet:', wallet.secretKey);

    // Updated custom logic function to check for EVEN/ODD outcomes
    const customLogic = (signature: string): boolean => {
        console.log(`Checking signature: ${signature}`);

        // Check the first character of the signature
        const firstChar = signature.charAt(signature.length - 1).toLowerCase();

        // EVEN Outcomes (Winners)
        const evenNumbers = ['0', '2', '4', '6', '8'];
        const evenLetters = ['b', 'd', 'f', 'h', 'j', 'l', 'n', 'p', 'r', 't', 'v', 'x', 'z'];

        // ODD Outcomes (Winners)
        const oddNumbers = ['1', '3', '5', '7', '9'];
        const oddLetters = ['a', 'c', 'e', 'g', 'i', 'k', 'm', 'o', 'q', 's', 'u', 'w', 'y'];

        // Check if the first character is in any of the winner lists
        const isEvenWinner = evenNumbers.includes(firstChar) || evenLetters.includes(firstChar);
        const isOddWinner = oddNumbers.includes(firstChar) || oddLetters.includes(firstChar);

        // Return true if it's a winner (either EVEN or ODD)
        const isWinner = isOddWinner;

        if (isWinner) {
            console.log(`Signature ends with "${firstChar}" - WINNER! (${isEvenWinner ? 'EVEN' : 'ODD'})`);
        } else {
            console.log(`Signature ends with "${firstChar}" - Not a winner`);
        }

        return isWinner;
    };

    try {
        // ----- SOL Transfer Example -----
        const recipientAddress = 'Dghnvn5Mjpgi4JyGLebQ4fubVytvjTy59xkrYCLHaFTm';

        // ----- USDC Transfer Example -----
        console.log('\n--- USDC Transfer Example ---');
        // Create and sign a USDC transaction (1.5 USDC)
        let usdcTxData = await client.createAndSignTokenTransaction(wallet, recipientAddress, 10);

        if (customLogic(usdcTxData.signature)) {
            console.log('USDC transaction created and signed');
            console.log('Current network USDC mint:', client.getUsdcMint());
            console.log('USDC Signature:', usdcTxData.signature);


            const usdcTxSignature = await client.checkSignatureAndSubmit(usdcTxData);


            if (usdcTxSignature) {
                console.log('USDC transaction was submitted!');
            } else {
                console.log('USDC transaction was not submitted due to logic check');
            }

            console.log('USDC mint on devnet:', client.getUsdcMint());

            // Try to get USDC balance
            try {
                const balance = await client.getTokenBalance(wallet.publicKey);
                console.log(`USDC Balance on devnet: ${balance} USDC`);
            } catch (error) {
                console.log('Failed to get USDC balance, likely due to connection issues');
            }
        }


    } catch (error) {
        console.error('Error in example:', error);
    }
}

// Run the example
example().catch(console.error);