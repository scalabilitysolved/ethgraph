import axios from 'axios';
import dotenv from 'dotenv';

const apiKey: any = process.env.ETHERSCAN_API_KEY;

interface EtherscanApiResponse {
    status: string;
    message: string;
    result: EthereumTransaction[];
}

interface EthereumTransaction {
    blockNumber: string;
    timeStamp: string;
    hash: string;
    nonce: string;
    blockHash: string;
    transactionIndex: string;
    from: string;
    to: string;
    value: string;
    gas: string;
    gasPrice: string;
    isError: string;
    txreceipt_status: string;
    input: string;
    contractAddress: string;
    cumulativeGasUsed: string;
    gasUsed: string;
    confirmations: string;
    methodId: string;
    functionName: string;
}

export interface EthereumAddress {
    address: string;
    senders: EthereumAddress[];
    depth: number;
}

async function getAccountTransactions(address: string, apiKey: string): Promise<EthereumTransaction[]> {
    const url = `https://api.etherscan.io/api`;
    const params = {
        module: 'account',
        action: 'txlist',
        address: address,
        startblock: 0,
        endblock: 99999999,
        sort: 'asc',
        apiKey: apiKey
    };

    try {
        console.log(`Fetching transactions for address: ${address}`);
        const response = await axios.get<EtherscanApiResponse>(url, {params});
        let result = response.data.result;
        console.log(`Fetched ${result.length} transactions for address: ${address}`);
        return result;
    } catch (error) {
        console.error(`Error fetching transactions: ${error}`);
        throw (error);
    }
}

async function extractAddresses(address: string, transactions: EthereumTransaction[], depth: number, maxDepth: number): Promise<EthereumAddress> {
    if (!Array.isArray(transactions) || transactions === undefined || !transactions || transactions.length === 0) {
        return {
            address: address,
            senders: [],
            depth: depth
        };
    }

    let accountRelationship: EthereumAddress = {
        address: address,
        senders: [],
        depth: depth
    };

    if (depth >= maxDepth) {
        return accountRelationship;
    }
    console.log(`Reducing transactions ${transactions}`);
    const transactionsMap = transactions.reduce((acc: any, transaction) => {
        if (transaction.from === address) {
            return acc;
        }

        if (!acc[transaction.from]) {
            acc[transaction.from] = [];
        }
        acc[transaction.from].push(transaction);
        return acc;
    }, {});

    console.log(`Address: ${address} has ${Object.keys(transactionsMap).length} senders`);
    console.log(`Address: ${address} has senders of ${Object.keys(transactionsMap)}`);

    for (const key of Object.keys(transactionsMap)) {
        if (key !== address) {
            if (depth < maxDepth - 1) {
                // Fetch transactions and recursively call extractAddresses
                const senderTransactions = await getAccountTransactions(key, apiKey);
                const senderAddress = await extractAddresses(key, senderTransactions, depth + 1, maxDepth);
                accountRelationship.senders.push(senderAddress);
            } else {
                // Just add sender addresses without further transactions
                accountRelationship.senders.push({address: key, senders: [], depth: depth + 1});
            }
        }
    }

    return accountRelationship;
}

export async function run(address: string): Promise<EthereumAddress> {
    let transactions = await getAccountTransactions(address, apiKey);
    return extractAddresses(address, transactions, 0, 2);
}
