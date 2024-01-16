"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
// Replace with your Etherscan API Key and the address you're interested in
const apiKey = 'NIKJT8YV9FU76JP3EN5YBMAKJK27TANE27';
const address = '0x28c6c06298d514db089934071355e5743bf21d60';
function getAccountTransactions(address, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
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
            const response = yield axios_1.default.get(url, { params });
            return response.data.result;
        }
        catch (error) {
            console.error(`Error fetching transactions: ${error}`);
            throw (error);
        }
    });
}
function extractAddresses(transactions) {
    if (transactions) {
        // loop over transactions and create a map where the key is the from value and the values are all the associated transactions
        let accountRelationship = {
            address: address,
            senders: []
        };
        const transactionsMap = transactions.reduce((acc, transaction) => {
            if (!acc[transaction.from]) {
                acc[transaction.from] = [];
            }
            acc[transaction.from].push(transaction);
            return acc;
        }, {});
        // loop over the keys of the map and prin
        Object.keys(transactionsMap).forEach(key => {
            accountRelationship.senders.push(key);
        });
        return accountRelationship;
    }
}
function run() {
    let promise = getAccountTransactions(address, apiKey);
    promise.then((transactions) => {
        let accountRelationship = extractAddresses(transactions);
        console.log(accountRelationship);
    });
}
run();
