# Azure App Service Deployment

## Quick Deploy to Azure

### Option 1: Deploy via Azure CLI

1. **Install Azure CLI** (if not already):
   ```powershell
   winget install Microsoft.AzureCLI
   ```

2. **Login to Azure**:
   ```powershell
   az login
   ```

3. **Create Resource Group & App Service**:
   ```powershell
   # Create resource group
   az group create --name TaxPilotRG --location eastus

   # Create App Service Plan (B1 for SSE support)
   az appservice plan create --name TaxPilotPlan --resource-group TaxPilotRG --sku B1 --is-linux

   # Create Web App
   az webapp create --resource-group TaxPilotRG --plan TaxPilotPlan --name tax-pilot-mcp --runtime "NODE:18-lts"
   ```

4. **Configure for Node.js ESM**:
   ```powershell
   az webapp config appsettings set --resource-group TaxPilotRG --name tax-pilot-mcp --settings WEBSITE_NODE_DEFAULT_VERSION=~18 SCM_DO_BUILD_DURING_DEPLOYMENT=true
   ```

5. **Deploy from Git**:
   ```powershell
   az webapp deployment source config --name tax-pilot-mcp --resource-group TaxPilotRG --repo-url https://github.com/Capithan/TaxPilot --branch main --manual-integration
   ```

### Option 2: Deploy via GitHub Actions

The workflow file `.github/workflows/azure.yml` is already configured. Just:

1. Go to Azure Portal → Your Web App → Deployment Center
2. Select GitHub as source
3. Authorize and select `Capithan/TaxPilot` repo
4. Azure will auto-deploy on every push

### Option 3: Deploy via VS Code

1. Install **Azure App Service** extension in VS Code
2. Sign in to Azure
3. Right-click on `TaxPilot` folder → "Deploy to Web App"
4. Follow prompts to create/select App Service

---

## After Deployment

Your MCP server will be available at:
```
https://tax-pilot-mcp.azurewebsites.net
```

### ChatGPT Configuration

In ChatGPT Developer Mode, add MCP server:
```
https://tax-pilot-mcp.azurewebsites.net/sse
```

### Test Endpoints

- Health: `https://tax-pilot-mcp.azurewebsites.net/health`
- SSE: `https://tax-pilot-mcp.azurewebsites.net/sse`
- OpenAPI: `https://tax-pilot-mcp.azurewebsites.net/openapi.yaml`

---

## Important: Enable WebSockets

For SSE to work properly, enable WebSockets in Azure:

```powershell
az webapp config set --resource-group TaxPilotRG --name tax-pilot-mcp --web-sockets-enabled true
```

Or via Portal: App Service → Configuration → General settings → Web sockets: On
