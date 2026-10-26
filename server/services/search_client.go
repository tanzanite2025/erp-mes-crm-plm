package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

const defaultSearchEngineURL = "http://127.0.0.1:18030"

// SearchServiceClient connects the Go business API to the Rust search/image sidecar.
type SearchServiceClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

type SearchDocument struct {
	ID                string   `json:"id"`
	Code              string   `json:"code"`
	Name              string   `json:"name"`
	Model             string   `json:"model"`
	Category          string   `json:"category"`
	RestrictedToUsers bool     `json:"restricted_to_users"`
	AllowedUserIDs    []string `json:"allowed_user_ids"`
}

type GlobalBusinessSearchEngineHit struct {
	ID       string  `json:"id"`
	Category string  `json:"category"`
	Score    float32 `json:"score"`
}

type SearchResponse struct {
	Items      []GlobalBusinessSearchEngineHit `json:"items"`
	HasMore    bool                            `json:"has_more"`
	Generation string                          `json:"generation"`
}

var GlobalSearchClient *SearchServiceClient

func InitSearchClient() {
	baseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("SEARCH_ENGINE_URL")), "/")
	if baseURL == "" {
		baseURL = defaultSearchEngineURL
	}
	GlobalSearchClient = &SearchServiceClient{BaseURL: baseURL, HTTPClient: &http.Client{Timeout: 5 * time.Second}}
	log.Printf("[SEARCH_CLIENT] Initialized with BaseURL: %s", baseURL)
}

func (client *SearchServiceClient) sendGlobalBusinessSearchJSON(searchContext context.Context, path string, payload, result any, requestTimeout time.Duration) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(searchContext, http.MethodPost, client.BaseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	// Query latency and full-snapshot publication have different time budgets.
	requestClient := *client.HTTPClient
	requestClient.Timeout = requestTimeout
	response, err := requestClient.Do(request)
	if err != nil {
		return fmt.Errorf("Rust search request %s: %w", path, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		if path == "/v1/search" && response.StatusCode == http.StatusConflict {
			return ErrGlobalBusinessSearchSnapshotChanged
		}
		message, _ := io.ReadAll(io.LimitReader(response.Body, 2048))
		return fmt.Errorf("Rust search %s returned %d: %s", path, response.StatusCode, strings.TrimSpace(string(message)))
	}
	if result != nil {
		return json.NewDecoder(response.Body).Decode(result)
	}
	_, err = io.Copy(io.Discard, response.Body)
	return err
}

func (client *SearchServiceClient) SearchGlobalBusinessIndex(searchContext context.Context, request GlobalBusinessSearchEngineRequest) (SearchResponse, error) {
	var response SearchResponse
	err := client.sendGlobalBusinessSearchJSON(searchContext, "/v1/search", request, &response, 5*time.Second)
	return response, err
}

func (client *SearchServiceClient) BeginGlobalBusinessSearchSnapshot(searchContext context.Context) (string, error) {
	var response struct {
		Token string `json:"token"`
	}
	err := client.sendGlobalBusinessSearchJSON(searchContext, "/v1/index/snapshot/start", struct{}{}, &response, 2*time.Minute)
	if err == nil && response.Token == "" {
		err = fmt.Errorf("Rust search returned an empty snapshot token")
	}
	return response.Token, err
}

func (client *SearchServiceClient) AppendGlobalBusinessSearchSnapshotBatch(searchContext context.Context, token string, documents []SearchDocument) error {
	return client.sendGlobalBusinessSearchJSON(searchContext, "/v1/index/snapshot/"+token+"/batch", documents, nil, 2*time.Minute)
}

func (client *SearchServiceClient) PublishGlobalBusinessSearchSnapshot(searchContext context.Context, token, generation string) error {
	return client.sendGlobalBusinessSearchJSON(searchContext, "/v1/index/snapshot/"+token+"/publish", map[string]string{"generation": generation}, nil, 2*time.Minute)
}

func (client *SearchServiceClient) AbortGlobalBusinessSearchSnapshot(searchContext context.Context, token string) error {
	return client.sendGlobalBusinessSearchJSON(searchContext, "/v1/index/snapshot/"+token+"/abort", struct{}{}, nil, 5*time.Second)
}

// ImageProcessResult contains the Rust sidecar's image fingerprint, WebP data and dimensions.
type ImageProcessResult struct {
	PHash      string `json:"phash"`
	WebPBase64 string `json:"webp_base64"`
	Width      uint32 `json:"width"`
	Height     uint32 `json:"height"`
}

// ProcessImage asks the Rust sidecar to compute pHash and encode WebP.
func (s *SearchServiceClient) ProcessImage(rawData []byte) (*ImageProcessResult, error) {
	url := fmt.Sprintf("%s/v1/process-image", s.BaseURL)
	resp, err := s.HTTPClient.Post(url, "application/octet-stream", bytes.NewReader(rawData))
	if err != nil {
		return nil, fmt.Errorf("request to rust image worker failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		responseBody, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return nil, fmt.Errorf("rust image worker returned status: %d (failed to read error body: %w)", resp.StatusCode, readErr)
		}

		message := strings.TrimSpace(string(responseBody))
		if message == "" {
			return nil, fmt.Errorf("rust image worker returned status: %d", resp.StatusCode)
		}

		return nil, fmt.Errorf("rust image worker returned status: %d, body: %s", resp.StatusCode, message)
	}

	var res ImageProcessResult
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, fmt.Errorf("decode rust image response failed: %w", err)
	}

	return &res, nil
}
