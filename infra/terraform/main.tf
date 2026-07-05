locals {
  generated_storage_account_name = substr(
    replace(lower("st${var.function_app_name}"), "/[^a-z0-9]/", ""),
    0,
    24,
  )

  effective_storage_account_name = coalesce(var.storage_account_name, local.generated_storage_account_name)
  effective_service_plan_name    = coalesce(var.service_plan_name, "${var.function_app_name}-plan")

  base_app_settings = {
    FUNCTIONS_WORKER_RUNTIME              = "node"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.this.connection_string
    APPINSIGHTS_INSTRUMENTATIONKEY        = azurerm_application_insights.this.instrumentation_key
    DEPLOYMENT_STORAGE_CONNECTION_STRING  = azurerm_storage_account.this.primary_connection_string
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

resource "azurerm_storage_container" "deployment" {
  name                  = "app-package-${var.function_app_name}"
  storage_account_name  = azurerm_storage_account.this.name
  container_access_type = "private"
}

resource "azurerm_application_insights" "this" {
  name                = "${var.function_app_name}-ai"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  application_type    = "web"
  tags                = var.tags
}

resource "azurerm_service_plan" "this" {
  name                = local.effective_service_plan_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  os_type             = "Linux"
  sku_name            = "FC1"
  tags                = var.tags
}

resource "azurerm_function_app_flex_consumption" "this" {
  name                = var.function_app_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name

  service_plan_id             = azurerm_service_plan.this.id
  runtime_name                = "node"
  runtime_version             = var.node_version
  storage_container_type      = "blobContainer"
  storage_container_endpoint  = "${azurerm_storage_account.this.primary_blob_endpoint}${azurerm_storage_container.deployment.name}"
  storage_authentication_type = "StorageAccountConnectionString"
  storage_access_key          = azurerm_storage_account.this.primary_connection_string
  instance_memory_in_mb       = 512
  maximum_instance_count      = 100
  https_only                  = true

  site_config {
    application_insights_connection_string = azurerm_application_insights.this.connection_string
    application_insights_key               = azurerm_application_insights.this.instrumentation_key
  }

  app_settings = merge(local.base_app_settings, local.secret_app_settings)

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}
