
# Ethereum Graph Viewer

## Description
Ethereum Graph Viewer is a D3.js-based web application that visualizes Ethereum transaction relationships. It allows users to enter an Ethereum address and view a graph representing the transaction interactions with the given address up to a specified depth level.

<img width="1508" alt="CleanShot 2024-01-16 at 22 41 57@2x" src="https://github.com/scalabilitysolved/ethgraph/assets/1309599/bf444edd-b3c5-4766-ba96-1822dba2f21a">
<img width="1507" alt="CleanShot 2024-01-16 at 22 45 54@2x" src="https://github.com/scalabilitysolved/ethgraph/assets/1309599/57f1f129-446b-458f-9fdf-46d422b2bfb6">


## Features
- **Ethereum Address Input**: Users can input any valid Ethereum address.
- **Graph Depth Selection**: Users can select the depth of the graph (1 to 3) to control the granularity of the visualization.
- **Interactive Graph**: The rendered graph is interactive, allowing users to zoom in/out and click on nodes for more information.

## Installation
To set up the Ethereum Graph Viewer on your local machine, follow these steps:

1. **Clone the Repository**
   ```bash
   git clone [repository URL]
   cd ethereum-graph-viewer
   ```

2. **Install Dependencies**
   ```bash
   npm run build

   ```

3. **Environment Variables**
    - Create a `.env` file in the root directory.
    - Add the following line (replace `<YOUR_ETHERSCAN_API_KEY>` with your actual Etherscan API key):
      ```
      ETHERSCAN_API_KEY=<YOUR_ETHERSCAN_API_KEY>
      ```

4. **Start the Application**
   ```bash
   npm run start
   ```

## Usage
Once the application is running:
1. Navigate to `http://localhost:3000` (or the configured port).
2. Enter an Ethereum address in the input box.
3. Select the desired graph depth.
4. Click on "Show Graph" to visualize the Ethereum address interactions.
