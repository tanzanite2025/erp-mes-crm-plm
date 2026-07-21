package services

import "testing"

func TestValidateEnterpriseLogoURLAllowsDefaultAndManagedUploads(t *testing.T) {
	validURLs := []string{
		"",
		DefaultEnterpriseLogoURL,
		"/uploads/enterprise-logo-123.png",
		"/uploads/enterprise-logo-123.jpg",
		"/uploads/enterprise-logo-123.jpeg",
	}

	for _, logoURL := range validURLs {
		if err := validateEnterpriseLogoURL(logoURL); err != nil {
			t.Fatalf("expected %q to be accepted: %v", logoURL, err)
		}
	}
}

func TestValidateEnterpriseLogoURLRejectsExternalAndUnsafePaths(t *testing.T) {
	invalidURLs := []string{
		"https://example.com/logo.png",
		"/brand/other.png",
		"/uploads/not-enterprise-logo.png",
		"/uploads/enterprise-logo-123.svg",
		"/uploads/enterprise-logo-../secret.png",
		"/uploads/enterprise-logo-123.png?cache=1",
		`/uploads/enterprise-logo-123\evil.png`,
	}

	for _, logoURL := range invalidURLs {
		if err := validateEnterpriseLogoURL(logoURL); err == nil {
			t.Fatalf("expected %q to be rejected", logoURL)
		}
	}
}
