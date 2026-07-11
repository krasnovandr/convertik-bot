terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "= 4.80.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-convertik-bot"
    storage_account_name = "tfstateconvertikbot"
    container_name       = "tfstate"
    key                  = "convertik-bot.tfstate"
  }
}

provider "azurerm" {
  features {}
}
