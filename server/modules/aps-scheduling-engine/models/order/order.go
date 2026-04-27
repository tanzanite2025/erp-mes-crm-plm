package order

import "time"

type Order struct {
	ID         string
	OrderNo    string
	Priority   int
	DueAt      time.Time
	Quantity   int
	AllowSplit bool
	RouteID    string
	Status     string
}
