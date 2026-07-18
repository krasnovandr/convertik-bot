# GitHub Actions Deployment Setup

This guide walks you through setting up automated deployment to Azure Function App — entirely through browser UIs, no terminal required.

---

## Overview

The workflow does the following on every push to `main`:
1. Builds the TypeScript project
2. Removes dev dependencies
3. Zips `dist/`, `node_modules/`, `host.json`, `package.json`, `package-lock.json`
4. Logs in to Azure (passwordless, via OIDC)
5. Deploys the ZIP to your Azure Function App

---

## Part 1 — Azure Portal: Create a Service Principal & Federated Credential

### Step 1 — Register an App in Azure Active Directory

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search for **"Microsoft Entra ID"** in the top search bar → open it
3. In the left menu click **App registrations**
4. Click **+ New registration**
5. Fill in:
   - **Name**: `convertik-bot-github-actions`
   - **Supported account types**: _Accounts in this organizational directory only_
6. Click **Register**
7. You are now on the app's overview page. **Copy and save**:
   - **Application (client) ID** → this is `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → this is `AZURE_TENANT_ID`

---

### Step 2 — Add a Federated Credential (passwordless login from GitHub)

> This is what allows GitHub Actions to log in to Azure without storing any password or secret.

1. Still on the app registration page, click **Certificates & secrets** in the left menu
2. Click the **Federated credentials** tab
3. Click **+ Add credential**
4. For **Federated credential scenario** select **GitHub Actions deploying Azure resources**
5. Fill in:
   - **Organization**: `krasnovandr`
   - **Repository**: `convertik-bot`
   - **Entity type**: `Branch`
   - **Branch**: `main`
   - **Name**: `github-main`
6. Click **Add**

---

### Step 3 — Grant the App Permission to Deploy

1. Search for **"Subscriptions"** in the top search bar → open your subscription
2. **Copy and save** the **Subscription ID** → this is `AZURE_SUBSCRIPTION_ID`
3. In the left menu click **Resource groups** → open the resource group that contains your Function App
4. In the left menu click **Access control (IAM)**
5. Click **+ Add** → **Add role assignment**
6. On the **Role** tab: search for `Website Contributor` → select it → click **Next**
7. On the **Members** tab:
   - **Assign access to**: _User, group, or service principal_
   - Click **+ Select members**
   - Search for `convertik-bot-github-actions` → select it → click **Select**
8. Click **Review + assign** → **Review + assign** again to confirm

---

## Part 2 — GitHub: Add Secrets and Variables

### Step 4 — Add Secrets (sensitive values)

1. Go to your repository on GitHub: `https://github.com/krasnovandr/convertik-bot`
2. Click **Settings** (top tab)
3. In the left menu expand **Secrets and variables** → click **Actions**
4. Click the **Secrets** tab → click **New repository secret** for each of the following:

| Secret name | Value |
|---|---|
| `AZURE_CLIENT_ID` | Application (client) ID from Step 1 |
| `AZURE_TENANT_ID` | Directory (tenant) ID from Step 1 |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID from Step 3 |

---

### Step 5 — Add Variables (non-sensitive config)

1. Still on the same **Secrets and variables → Actions** page
2. Click the **Variables** tab → click **New repository variable** for each:

| Variable name | Value |
|---|---|
| `AZURE_RESOURCE_GROUP` | Name of your Azure resource group (e.g. `convertik-rg`) |
| `AZURE_FUNCTION_APP_NAME` | Name of your Azure Function App (e.g. `convertik-bot`) |

---

## Part 3 — Trigger Your First Deployment

### Option A — Push to main
Any push to the `main` branch automatically triggers the workflow.

### Option B — Manual trigger (no push needed)
1. Go to your repository → click the **Actions** tab
2. In the left list click **Deploy to Azure Function App**
3. Click **Run workflow** → **Run workflow**

---

## Verifying the Deployment

1. Go to the **Actions** tab in your repository
2. Click the running (or latest) workflow
3. Click the **Build & Deploy** job to see step-by-step logs
4. A green checkmark means the deployment succeeded

To confirm in Azure:
- Open your Function App in the Azure Portal → **Functions** → check your functions are listed

---

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `AADSTS70021: No matching federated identity record` | Branch name or repo name typo in federated credential | Re-check Step 2 — organization, repo, and branch must match exactly |
| `AuthorizationFailed` | App not assigned the role | Re-do Step 3 |
| `ResourceNotFound` | Wrong resource group or function app name | Re-check the Variables in Step 5 |
| `npm ci` fails | `package-lock.json` not committed | Commit `package-lock.json` to the repository |
