package services

type QuoteDetailLineResponse struct {
	ID            uint    `json:"id"`
	LineNo        int     `json:"lineNo"`
	ProductModel  string  `json:"productModel"`
	ProductCode   string  `json:"productCode"`
	Specification string  `json:"specification"`
	Qty           float64 `json:"qty"`
	Price         float64 `json:"price"`
	Amount        float64 `json:"amount"`
	UOM           string  `json:"uom"`
	Note          string  `json:"note"`
}

type QuoteDetailResponse struct {
	ID                string                    `json:"id"`
	QuoteNo           string                    `json:"quoteNo"`
	OrderName         string                    `json:"orderName"`
	CustomerName      string                    `json:"customerName"`
	CustomerID        string                    `json:"customerId"`
	WeChat            string                    `json:"wechat"`
	WhatsApp          string                    `json:"whatsapp"`
	CustomerSegment   string                    `json:"customerSegment"`
	Type              string                    `json:"type"`
	Status            string                    `json:"status"`
	Currency          string                    `json:"currency"`
	AmountLabel       string                    `json:"amountLabel"`
	QuantityLabel     string                    `json:"quantityLabel"`
	OrderDate         string                    `json:"orderDate"`
	DeliveryDate      string                    `json:"deliveryDate"`
	PaymentMethodName string                    `json:"paymentMethodName"`
	PaymentTermName   string                    `json:"paymentTermName"`
	Requirements      string                    `json:"requirements"`
	OwnerName         string                    `json:"ownerName"`
	UpdatedAt         string                    `json:"updatedAt"`
	Lines             []QuoteDetailLineResponse `json:"lines"`
}

type QuoteConvertResponse struct {
	QuoteID            string `json:"quoteId"`
	TargetSalesOrderID string `json:"targetSalesOrderId"`
	TargetSalesOrderNo string `json:"targetSalesOrderNo"`
	Status             string `json:"status"`
}
