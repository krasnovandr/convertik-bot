# Terraform Infra

This folder provisions Azure infrastructure for the bot using Terraform.

## What gets created / managed

- Resource Group
- Storage Account
- Flex Consumption Plan (FC1)
- Azure Function App Flex Consumption (Node runtime)
- Application Insights (Function invocation logs)
- Cosmos DB account (imported from an existing account - see below)
- Function App settings for COSMOS_CONNECTION_STRING, BOT_TOKEN, USER_ID_1, USER_ID_2 (last three optional)

## Cosmos DB import (one-time, existing account)

The Cosmos DB account itself is NOT created by `terraform apply` from scratch - it must already
exist (this repo's account `convertik-bot` in `rg-convertik-bot` was created outside Terraform).
Bring it under management once with `terraform import` before your first `apply`:

PowerShell:
terraform import azurerm_cosmosdb_account.this "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.DocumentDB/databaseAccounts/<cosmos-account-name>"

After import, `terraform plan` should show no changes (or only tag drift, which is ignored).
If you are provisioning a brand-new environment without a pre-existing Cosmos DB account, remove
the `azurerm_cosmosdb_account` resource from main.tf and provision one separately first.

The app creates its own database (`home-budget`) and containers on first run - Terraform only
manages the account itself.

## Prerequisites

- Terraform >= 1.6
- Azure CLI (for authentication only)
- Logged-in Azure session: az login
- An existing Cosmos DB account, imported as described above

## 1) Initialize Terraform

From repository root:

PowerShell:
cd ./infra/terraform
terraform init

## 2) Configure variables

Copy the example file:

PowerShell:
Copy-Item terraform.tfvars.example terraform.tfvars

Edit terraform.tfvars with your values:
- resource_group_name
- location
- function_app_name
- service_plan_name (optional, set when reusing an existing plan)
- node_version (default 24)
- cosmos_account_name (required - name of the existing Cosmos DB account, imported per step above)
- cosmos_location (required - must match the account's actual Azure region)
- bot_token, user_id_1, user_id_2

Do not commit terraform.tfvars if it contains secrets.

## 3) Plan and apply

PowerShell:
terraform plan -out tfplan
terraform apply tfplan

## 4) Get webhook URL

PowerShell:
terraform output webhook_url

Optional (view Cosmos DB account details):

PowerShell:
terraform output cosmos_account_name
terraform output cosmos_endpoint
terraform output cosmos_database_name

Optional (verify Application Insights wiring):

PowerShell:
terraform output application_insights_name

Use the webhook_url output in Telegram setWebhook call.

## 5) Deploy app code (separate step)

Terraform provisions infrastructure only. Deploying the function code is a separate action.

Prerequisites:
- Azure CLI logged in
- Node.js + npm installed

From repository root:

PowerShell:
./scripts/deploy-function.ps1 -ResourceGroup "rg-convertik-bot" -FunctionAppName "convertik-bot-func"

The deployment script will:
- Build TypeScript output (dist)
- Install production dependencies (node_modules)
- Create deploy.zip
- Deploy zip package with az functionapp deploy

## 6) Optional cleanup

PowerShell:
terraform destroy
