package handlers

import (
	"errors"
	"strings"
	"testing"
	"xdfc-server/services"
)

func TestValidateAIProxyMessagesRejectsOversizedContent(t *testing.T) {
	oversized := strings.Repeat("好", defaultAIProxyMaxMessageContentRunes+1)

	err := validateAIProxyMessages([]AiProxyMessage{{
		Role:    "user",
		Content: oversized,
	}})

	if err == nil {
		t.Fatal("expected oversized content to be rejected")
	}
}

func TestBuildAIProxyUpstreamRequestRequiresOpenAIModel(t *testing.T) {
	_, err := buildAIProxyUpstreamRequest(services.AIPolicy{
		API: services.AIGatewayConfig{
			Provider: "openai",
			APIKey:   "test-key",
			BaseURL:  "https://api.openai.com",
			Model:    " ",
		},
	}, AiProxyRequest{
		Messages: []AiProxyMessage{{Role: "user", Content: "hello"}},
	})

	if err == nil {
		t.Fatal("expected empty OpenAI model to be rejected")
	}
	if !strings.Contains(err.Error(), "model") {
		t.Fatalf("expected model error, got %v", err)
	}
}

func TestReadAIProxyResponseBodyRejectsOversizedBody(t *testing.T) {
	_, err := readAIProxyResponseBody(strings.NewReader("abcdef"), 5)

	if !errors.Is(err, errAIProxyResponseTooLarge) {
		t.Fatalf("expected response size error, got %v", err)
	}
}
