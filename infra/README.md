# Terraform Infra

This folder provisions Azure infrastructure for the bot using Terraform.

## What gets created

- Resource Group
- Storage Account
- Flex Consumption Plan (FC1)
- Azure Function App Flex Consumption (Node runtime)
- Application Insights (Function invocation logs)
- Function App settings for BOT_TOKEN, USER_ID_1, USER_ID_2 (optional)

## Prerequisites

- Terraform >= 1.6
- Azure CLI (for authentication only)
- Logged-in Azure session: az login

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
- bot_token, user_id_1, user_id_2

Do not commit terraform.tfvars if it contains secrets.

## 3) Plan and apply

PowerShell:
terraform plan -out tfplan
terraform apply tfplan

## 4) Get webhook URL

PowerShell:
terraform output webhook_url

Optional (verify Application Insights wiring):

PowerShell:
terraform output application_insights_name

Use the output in Telegram setWebhook call.

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
