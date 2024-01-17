import * as d3 from 'https://cdn.skypack.dev/d3@7';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('address-form');
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const address = document.getElementById('ethereum-address').value;
        const validationMessageDiv = document.getElementById('validation-message');

        if (!isValidEthereumAddress(address)) {
            validationMessageDiv.textContent = "Please enter a valid Ethereum address.";
            validationMessageDiv.style.display = 'block';
            return;
        } else {
            validationMessageDiv.style.display = 'none';
        }

        const depth = document.querySelector('input[name="depth"]:checked').value;

        document.getElementById('form-container').style.display = 'none';
        document.getElementById('loading-indicator').style.display = 'block';
        document.getElementById('zoom-controls').style.display = 'none';

        fetchDataFromServer(address, depth);
    });
});

async function fetchDataFromServer(address, depth) {
    try {
        const response = await fetch(`/data?address=${address}&depth=${depth}`);
        if (!response.ok) {
            throw new Error(`Server response not ok: ${response.status} and ${response.statusText}`);
        }
        const data = await response.json();

        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('graph-container').style.display = 'block';
        renderGraph(data, address);
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('form-container').style.display = 'block';
    }
}

function isValidEthereumAddress(address) {
    const re = /^0x[a-fA-F0-9]{40}$/;
    return re.test(address);
}

function flattenData(accountRelationship) {
    const nodes = [];
    const links = [];
    const added = new Set();

    function addNode(node) {
        if (!added.has(node.address)) {
            nodes.push({id: node.address, group: node.depth, balance: node.balance});
            added.add(node.address);
        }
    }

    function addLink(source, target) {
        links.push({source: source, target: target});
    }

    function processNode(node, parentNode = null, depth = 0) {
        addNode(node);

        if (parentNode) {
            addLink(parentNode.address, node.address);
        }

        node.senders.forEach(sender => {
            processNode(sender, node, depth + 1);
        });
    }

    processNode(accountRelationship);
    return {nodes, links};
}

function renderGraph(accountRelationship, rootAddress) {
    if (!accountRelationship) {
        console.error('No data received from the server');
        return;
    }

    const {nodes, links} = flattenData(accountRelationship);

    nodes.forEach(node => {
        node.isRoot = node.id === rootAddress;
    });
    console.log(nodes.map(n => n.balance)); // Add this line in `renderGraph` to log balances

    const width = window.innerWidth;
    const height = window.innerHeight;

    d3.select("#graph-container").selectAll("svg").remove();

    const svg = d3.select("#graph-container").append("svg")
        .attr("width", width)
        .attr("height", height);


    const balanceColorScale = d3.scaleThreshold()
        .domain([0.1, 1, 10, 100])
        .range(["#00FF00", "#7FFF00", "#FFFF00", "#FFA500", "#FF0000"]);


    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100).strength(1))
        .force("charge", d3.forceManyBody().strength(-1500))
        .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", d => Math.sqrt(d.value));

    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 5)
        .join("circle")
        .attr("class", "d3-circle") // Add a class
        .attr("fill", d => balanceColorScale(parseFloat(d.balance)))
        .call(drag(simulation));

    const labels = svg.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(d => d.id.substring(0, 5));

    const thresholds = balanceColorScale.domain();
    const range = balanceColorScale.range();
    const legendData = range.map((color, i) => {
        if (i === 0) {
            return {color: color, label: `Less than ${thresholds[i]} ETH`};
        } else if (i < thresholds.length) {
            return {color: color, label: `${thresholds[i - 1]} - ${thresholds[i]} ETH`};
        } else {
            return {color: color, label: `More than ${thresholds[i - 1]} ETH`};
        }
    });


    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20,20)"); // Adjust position as needed

    legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 25) // Increased spacing
        .attr("width", 20) // Increased size
        .attr("height", 20) // Increased size
        .style("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 30) // Adjust text position
        .attr("y", (d, i) => i * 25 + 10) // Adjust text position
        .attr("dy", ".35em")
        .text(d => d.label);

    node.on("click", function (event, d) {
        event.stopPropagation();
        document.getElementById('info-address').textContent = 'Address: ' + d.id;
        document.getElementById('info-balance').textContent = `Balance: ${d.balance} ETH`;
        document.getElementById('info-link').href = 'https://etherscan.io/address/' + d.id;

        const infoCard = document.getElementById('info-card');
        infoCard.style.display = 'block';
        infoCard.style.left = event.pageX + 'px';
        infoCard.style.top = event.pageY + 'px';
    });

    svg.on("click", function () {
        document.getElementById('info-card').style.display = 'none';
    });

    node.append("title")
        .text(d => d.id);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        labels
            .attr("x", d => d.x + 10)
            .attr("y", d => d.y);
    });

    document.getElementById('zoom-controls').style.display = 'flex';

    let currentZoom = 1;
    const zoomStep = 0.1;

    document.getElementById('zoom-in').addEventListener('click', () => {
        currentZoom += zoomStep;
        svg.transition().call(zoom.scaleTo, currentZoom);
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        currentZoom = Math.max(currentZoom - zoomStep, 0.1);
        svg.transition().call(zoom.scaleTo, currentZoom);
    });

    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
}
