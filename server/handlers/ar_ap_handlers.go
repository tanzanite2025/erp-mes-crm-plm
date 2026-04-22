package handlers

import (
	"github.com/gin-gonic/gin"
)

func GetReceivableLedgersHandler(c *gin.Context) {
	getReceivableLedgersHandler(c)
}

func SearchPayableLedgersHandler(c *gin.Context) {
	searchPayableLedgersHandler(c)
}

func SearchReceivableLedgersHandler(c *gin.Context) {
	searchReceivableLedgersHandler(c)
}

func GetReceivableLedgerHandler(c *gin.Context) {
	getReceivableLedgerHandler(c)
}

func GetPayableLedgerHandler(c *gin.Context) {
	getPayableLedgerHandler(c)
}

func CreateReceiptRecordHandler(c *gin.Context) {
	createReceiptRecordHandler(c)
}

func CreatePaymentRecordHandler(c *gin.Context) {
	createPaymentRecordHandler(c)
}

func GetPayableLedgersHandler(c *gin.Context) {
	getPayableLedgersHandler(c)
}
