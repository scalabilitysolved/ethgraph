import * as d3 from 'https://cdn.skypack.dev/d3@7';

let container;
const addressForm = document.getElementById('address-form');
const formContainer = document.getElementById('form-container');
const ethereumAddressInput = document.getElementById('ethereum-address');
const validationMessageDiv = document.getElementById('validation-message');
const loadingIndicator = document.getElementById('loading-indicator');
const zoomControls = document.getElementById('zoom-controls');
const graphContainer = document.getElementById('graph-container');
const infoCard = document.getElementById('info-card');


document.addEventListener('DOMContentLoaded', function () {
    console.log("Going to request recent addresses");

    fetchRecentAddresses()
        .then(recentAddresses => {
            console.log('Recent addresses:', recentAddresses);
            displayRecentAddresses(recentAddresses);
        })
        .catch(error => {
            console.error('Error initializing recent addresses:', error);
        });

    addressForm.addEventListener('submit', function (event) {
        console.log("Event listener triggered for addressForm");
        produceGraph(event);
    });
});

function produceGraph(event) {
    event.preventDefault();
    const address = ethereumAddressInput.value;

    if (!isValidEthereumAddress(address)) {
        validationMessageDiv.textContent = "Please enter a valid Ethereum address.";
        validationMessageDiv.style.display = 'block';
        return;
    } else {
        validationMessageDiv.style.display = 'none';
    }

    const depth = document.querySelector('input[name="depth"]:checked').value;

    formContainer.style.display = 'none';
    console.log("Showing loading indicator");
    loadingIndicator.style.display = 'block';
    zoomControls.style.display = 'none';

    executeRequest(`/data?address=${address}&depth=${depth}`)
        .then(data => {
            graphContainer.style.display = 'block';
            formContainer.style.display = 'none';
            renderGraph(data, address, "produceGraph");
        }).catch(error => {
        console.error('Error fetching data:', error);
        loadingIndicator.style.display = 'none';
        formContainer.style.display = 'block';
    });
}


async function fetchRecentAddresses() {
    return executeRequest('/recent-addresses')
        .then(recentAddresses => {
            return recentAddresses;
        }).catch(error => {
            console.error('Error fetching recent addresses:', error);
            return [];
        });
}

async function executeRequest(url) {
    return fetch(url).then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    });
}

function displayRecentAddresses(addressesWithDepth) {
    const container = document.getElementById('recent-addresses-container');
    let list = container.querySelector('ul');
    if (!list) {
        list = document.createElement('ul');
        container.appendChild(list);
    }
    list.innerHTML = ''; // Clear current list items

    addressesWithDepth.forEach(item => {
        const [address, depth] = item.split('-');

        let listItem = document.createElement('li');
        listItem.textContent = `${address} (Depth: ${depth})`; // Display both
        listItem.onclick = () => {
            ethereumAddressInput.value = address;
            executeRequest(`/data?address=${address}&depth=${depth}`)
                .then(data => {
                    graphContainer.style.display = 'block';
                    formContainer.style.display = 'none';
                    renderGraph(data, address, "displayRecentAddresses");
                }).catch(error => {
                console.error('Error fetching data:', error);
                loadingIndicator.style.display = 'none';
                formContainer.style.display = 'block';
            });
        };
        list.appendChild(listItem);
    });


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

function renderGraph(accountRelationship, rootAddress, caller) {
    //TODO Can probably delete this now

    console.log(`Rendering graph and invoked by ${caller}`);
    if (!accountRelationship) {
        console.error('No data received from the server');
        return;
    }
    const {nodes, links} = flattenData(accountRelationship);

    nodes.forEach(node => {
        node.isRoot = node.id === rootAddress;
    });

    const width = window.innerWidth;
    const height = window.innerHeight;

    d3.select("#graph-container").selectAll("svg").remove();

    const svg = d3.select("#graph-container").append("svg")
        .attr("width", width)
        .attr("height", height);

    container = svg.append("g");
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
            console.log("Setting zoom");
            container.attr("transform", event.transform);
        });
    svg.call(zoom);


    svg.append('defs').selectAll('marker')
        .data(['end']) // This can be a list if you have different types of markers
        .enter().append('marker')
        .attr('id', String)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25) // Adjust this value to position the arrowhead along the link line
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#999');

    const balanceColorScale = d3.scaleThreshold()
        .domain([0.1, 1, 10, 100])
        .range(["#00FF00", "#7FFF00", "#FFFF00", "#FFA500", "#FF0000"]);

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100).strength(1))
        .force("charge", d3.forceManyBody().strength(-1500))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("end", () => {
            zoomControls.style.display = 'flex';

            // Calculate bounding box of the graph
            let minX = d3.min(nodes, d => d.x),
                minY = d3.min(nodes, d => d.y),
                maxX = d3.max(nodes, d => d.x),
                maxY = d3.max(nodes, d => d.y),
                graphWidth = maxX - minX,
                graphHeight = maxY - minY,
                width = svg.attr("width"),
                height = svg.attr("height"),
                scale = Math.min(width / graphWidth, height / graphHeight) * 0.8, // 0.8 for padding
                translate = [
                    (width - scale * (maxX + minX)) / 2,
                    (height - scale * (maxY + minY)) / 2
                ];


            svg.transition().duration(500).call(
                zoom.transform,
                d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );
        });

    const link = container.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", d => Math.sqrt(d.value))
        .attr('marker-end', 'url(#end)'); // Attach arrowhead to link

    const node = container.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 5)
        .join("circle")
        .attr("class", "d3-circle")
        .attr("fill", d => d.id === rootAddress ? "#0000FF" : balanceColorScale(parseFloat(d.balance))) // Blue for root node
        .call(drag(simulation));

    const labels = container.append("g")
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
        .attr("transform", "translate(20,20)");

    legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 25)
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 30)
        .attr("y", (d, i) => i * 25 + 10)
        .attr("dy", ".35em")
        .text(d => d.label);

    node.on("click", function (event, d) {
        event.stopPropagation();
        document.getElementById('info-address').textContent = 'Address: ' + d.id;
        document.getElementById('info-balance').textContent = `Balance: ${d.balance} ETH`;
        document.getElementById('info-link').href = 'https://etherscan.io/address/' + d.id;

        infoCard.style.display = 'block';
        infoCard.style.left = event.pageX + 'px';
        infoCard.style.top = event.pageY + 'px';
    });

    svg.on("click", function () {
        infoCard.style.display = 'none';
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


    zoomControls.style.display = 'flex';

    document.getElementById('zoom-in').addEventListener('click', () => {
        zoom.scaleBy(svg.transition().duration(750), 1.2);
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        zoom.scaleBy(svg.transition().duration(750), 0.8);
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

    //Call loading indicator off here because if called on the end event for d3 the graph will still be stabilizing
    loadingIndicator.style.display = 'none';
}
