import express from 'express';
import {run, EthereumAddress} from './main';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/data', async (req, res) => {
    const address = req.query.address;

    let depth = parseInt(req.query.depth as string); // Parse depth as integer
    console.log("LOGGY " + depth);
    if (isNaN(depth) || depth < 1 || depth > 5) {
        depth = 2;
    }

    if (!address) {
        res.status(400).json({error: 'Ethereum address is required'});
        return;
    }

    try {
        // if address is test, return test data
        if (address.toString() === "test") {
            res.json(testData());
            return;
        }
        const accountRelationship = await run(address.toString(), depth);
        console.log(JSON.stringify(accountRelationship));
        res.json(accountRelationship);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({error: 'Internal Server Error', message: error});
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

function testData() {
    let a: EthereumAddress = {
        address: "test",
        senders: [],
        depth: 0,
        balance: "0"
    };

    let babyOneChild: EthereumAddress = {
        address: "0xbd237a6df1aae2faa85ef690a33768f73d41604f",
        senders: [],
        depth: 1,
        balance: "0"
    };

    let babyTwoChild: EthereumAddress = {
        address: "babyTwoChild",
        senders: [],
        depth: 1,
        balance: "0"
    }

    let babyThreeChild: EthereumAddress = {
        address: "babyThreeChild",
        senders: [],
        depth: 1,
        balance: "0"
    }

    let babyNoChildren: EthereumAddress = {
        address: "babyNoChildren",
        senders: [],
        depth: 1,
        balance: "0"
    };

    let grandBaby: EthereumAddress = {
        address: "grandBaby",
        senders: [],
        depth: 2,
        balance: "0"
    };

    let grandBabyTwo: EthereumAddress = {
        address: "grandBabyTwo",
        senders: [],
        depth: 2,
        balance: "0"
    };

    let grandBabyThree: EthereumAddress = {
        address: "grandBabyThree",
        senders: [],
        depth: 2,
        balance: "0"
    }

    let grandBabyFour: EthereumAddress = {
        address: "grandBabyFour",
        senders: [],
        depth: 2,
        balance: "0"
    }

    let greatGrandBaby: EthereumAddress = {
        address: "greatGrandBaby",
        senders: [],
        depth: 3,
        balance: "0"
    }

    let greatGrandBabyTwo: EthereumAddress = {
        address: "greatGrandBabyTwo",
        senders: [],
        depth: 3,
        balance: "0"
    }

    let greatGrandBabyThree: EthereumAddress = {
        address: "greatGrandBabyThree",
        senders: [],
        depth: 3,
        balance: "0"
    }

    let greatGrandBabyFour: EthereumAddress = {
        address: "greatGrandBabyFour",
        senders: [],
        depth: 3,
        balance: "0"
    }

    let greatGreatGrandBaby: EthereumAddress = {
        address: "greatGreatGrandBaby",
        senders: [],
        depth: 4,
        balance: "0"
    }


    a.senders.push(babyOneChild, babyNoChildren, babyTwoChild, babyThreeChild);
    babyOneChild.senders.push(grandBaby, grandBabyTwo);
    babyThreeChild.senders.push(grandBabyThree, grandBabyFour);
    grandBabyFour.senders.push(greatGrandBaby, greatGrandBabyTwo, greatGrandBabyThree, greatGrandBabyFour);
    greatGrandBabyThree.senders.push(greatGreatGrandBaby);
    return a;
}
