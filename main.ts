import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

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
    balance: string;
    senders: EthereumAddress[];
    depth: number;
}

// Create a rate-limited Axios instance
const http = rateLimit(axios.create(), {
    maxRequests: 5,
    perMilliseconds: 1000,
});

async function executeRequest(url: string, params: any) {
    try {
        const response = await http.get<EtherscanApiResponse>(url, {params}); // Use the rate-limited instance
        return response.data.result;
    } catch (error) {
        console.error(`Error fetching transactions: ${error}`);
        throw error;
    }
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
    return await executeRequest(url, params);
}

async function getAccountBalances(addresses: string[], apiKey: string): Promise<any> {
    const url = `https://api.etherscan.io/api`;
    const params = {
        module: 'account',
        action: 'balancemulti',
        address: addresses.join(','),
        tag: 'latest',
        apiKey: apiKey
    };

    return executeRequest(url, params);
}

async function extractAddresses(address: string, transactions: EthereumTransaction[], depth: number, maxDepth: number): Promise<EthereumAddress> {
    if (!Array.isArray(transactions) || transactions.length === 0) {
        return {
            address: address,
            senders: [],
            balance: "0",
            depth: depth
        };
    }

    let accountRelationship: EthereumAddress = {
        address: address,
        senders: [],
        balance: "0",
        depth: depth
    };

    if (depth >= maxDepth) {
        return accountRelationship;
    }

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

    for (const key of Object.keys(transactionsMap)) {
        if (key !== address) {
            if (depth < maxDepth - 1) {
                const senderTransactions = await getAccountTransactions(key, apiKey);
                const senderAddress = await extractAddresses(key, senderTransactions, depth + 1, maxDepth);
                accountRelationship.senders.push(senderAddress);
            } else {
                accountRelationship.senders.push({address: key, senders: [], depth: depth + 1, balance: "0"});
            }
        }
    }

    return accountRelationship;
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

function getAllUniqueAddresses(relationshipData: EthereumAddress): string[] {
    const addresses = new Set<string>();

    function addAddress(addressData: EthereumAddress) {
        if (!addresses.has(addressData.address)) {
            addresses.add(addressData.address);
            addressData.senders.forEach(addAddress);
        }
    }

    addAddress(relationshipData);
    return Array.from(addresses);
}

function combineBalancesWithRelationshipData(relationshipData: EthereumAddress, balances: any[]): EthereumAddress {
    const balanceMap = new Map(balances.map(b => [b.account, b.balance]));

    function addBalance(addressData: EthereumAddress) {
        if (balanceMap.has(addressData.address)) {
            addressData.balance = weiToEther(balanceMap.get(addressData.address));
        }
        addressData.senders.forEach(addBalance);
    }

    addBalance(relationshipData);
    return relationshipData;
}


export async function run(address: string, maxDepth: number): Promise<EthereumAddress> {
    let transactions = await getAccountTransactions(address, apiKey);
    let addresses = await extractAddresses(address, transactions, 0, maxDepth);

    // Extract all unique addresses
    const allAddresses = getAllUniqueAddresses(addresses);

    // Chunk addresses into batches of 20
    const addressChunks = chunkArray(allAddresses, 20);

    // Fetch balances for each chunk
    const balancePromises = addressChunks.map(chunk => getAccountBalances(chunk, apiKey));
    const balanceResults = (await Promise.all(balancePromises)).flat();

    // Combine balance data with relationship data
    return combineBalancesWithRelationshipData(addresses, balanceResults);
}

function weiToEther(wei: string | number): string {
    const weiPerEther = 1e18;
    const ether = Number(wei) / weiPerEther;
    return ether.toFixed(18);
}

