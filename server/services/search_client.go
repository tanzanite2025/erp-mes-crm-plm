package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

// SearchServiceClient 负责与 Rust 搜索微服务通信情况情况总量针对。
type SearchServiceClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

// SearchDocument 对应 Rust 端的索引文档结构
type SearchDocument struct {
	ID       string `json:"id"`
	Code     string `json:"code"`
	Name     string `json:"name"`
	Model    string `json:"model"`
	Category string `json:"category"`
	Version  uint64 `json:"version"`
}

var (
	GlobalSearchClient *SearchServiceClient
)

func InitSearchClient() {
	baseURL := os.Getenv("SEARCH_ENGINE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8081"
	}

	GlobalSearchClient = &SearchServiceClient{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
	log.Printf("[SEARCH_CLIENT] Initialized with BaseURL: %s", baseURL)
}

// SyncIndex 将文档同步到 Rust 搜索引擎情况情况总量针对。
func (s *SearchServiceClient) SyncIndex(doc SearchDocument) error {
	url := fmt.Sprintf("%s/v1/index", s.BaseURL)
	payload, err := json.Marshal(doc)
	if err != nil {
		return fmt.Errorf("marshal search doc failed: %w", err)
	}

	resp, err := s.HTTPClient.Post(url, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		// Fail Loudly: 搜索同步失败必须产生核心告警
		log.Printf("[CRITICAL][SEARCH_OFFLINE] Failed to sync search index for ID %s: %v", doc.ID, err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[CRITICAL][SEARCH_ERROR] Search engine returned status %d for ID %s", resp.StatusCode, doc.ID)
		return fmt.Errorf("search engine status: %d", resp.StatusCode)
	}

	return nil
}

// SearchResponse 从引擎返回的搜索命中结果情况情况总量针对。
type SearchResponse struct {
	Items []struct {
		ID    string  `json:"id"`
		Score float32 `json:"score"`
	} `json:"items"`
}

// Search 调用 Rust 搜索引擎执行全文检索情况情况总量针对。
func (s *SearchServiceClient) Search(query string) (SearchResponse, error) {
	url := fmt.Sprintf("%s/v1/search?q=%s", s.BaseURL, query)
	resp, err := s.HTTPClient.Get(url)
	if err != nil {
		return SearchResponse{}, fmt.Errorf("search request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return SearchResponse{}, fmt.Errorf("search engine status: %d", resp.StatusCode)
	}

	var res SearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return SearchResponse{}, fmt.Errorf("decode search response failed: %w", err)
	}

	return res, nil
}

// HealthCheck 检查搜索服务连通性
func (s *SearchServiceClient) HealthCheck() bool {
	url := fmt.Sprintf("%s/v1/health", s.BaseURL)
	resp, err := s.HTTPClient.Get(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}
