package services

import "net/url"

type GlobalBusinessSearchItem struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Code        string  `json:"code"`
	Category    string  `json:"category"`
	Href        string  `json:"href"`
	ParentTitle string  `json:"parentTitle"`
	Score       float32 `json:"score"`
}

func buildGlobalBusinessSearchResultHref(source globalBusinessSearchSource, item GlobalBusinessSearchItem) string {
	query := url.Values{}
	if source.detailParameter != "" {
		query.Set(source.detailParameter, item.ID)
	}
	if source.detailParameter != "productId" && source.detailParameter != "requestId" {
		searchTerm := item.Code
		if searchTerm == "" {
			searchTerm = item.Title
		}
		query.Set("search", searchTerm)
	}
	return source.href + "?" + query.Encode()
}
