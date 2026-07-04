locals {
  generated_storage_account_name = substr(
    replace(lower("st${var.function_app_name}"), "/[^a-z0-9]/", ""),
    0,
    24,
  )

  effective_storage_account_name = coalesce(var.storage_account_name, local.generated_storage_account_name)

  base_app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "node"
  }

  secret_app_settings = merge(
    var.bot_token != null ? { BOT_TOKEN = var.bot_token } : {},
    var.user_id_1 != null ? { USER_ID_1 = var.user_id_1 } : {},
    var.user_id_2 != null ? { USER_ID_2 = var.user_id_2 } : {},
  )
}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_storage_account" "this" {
  name                     = local.effective_storage_account_name
  resource_group_name      = azurerm_resource_group.this.name
  location                 = azurerm_resource_group.this.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = var.tags
}

resource "azurerm_service_plan" "this" {
  name                = "${var.function_app_name}-plan"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  os_type             = "Linux"
  sku_name            = "Y1"
  tags                = var.tags
}

resource "azurerm_linux_function_app" "this" {
  name                = var.function_app_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name

  service_plan_id            = azurerm_service_plan.this.id
  storage_account_name       = azurerm_storage_account.this.name
  storage_account_access_key = azurerm_storage_account.this.primary_access_key

  functions_extension_version = var.functions_extension_version

  site_config {
    application_stack {
      node_version = var.node_version
    }
  }

  app_settings = merge(local.base_app_settings, local.secret_app_settings)

  tags = var.tags
}
