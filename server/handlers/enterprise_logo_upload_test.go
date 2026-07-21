package handlers

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"path/filepath"
	"strings"
	"testing"
)

func encodeTestPNG(t *testing.T, width int, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.RGBA{R: 25, G: 118, B: 210, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return buf.Bytes()
}

func encodeTestJPEG(t *testing.T, width int, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, nil); err != nil {
		t.Fatalf("encode jpeg: %v", err)
	}
	return buf.Bytes()
}

func TestValidateEnterpriseLogoBytesAcceptsPNGAndJPEG(t *testing.T) {
	if ext, err := validateEnterpriseLogoBytes(encodeTestPNG(t, 64, 64)); err != nil || ext != ".png" {
		t.Fatalf("expected png to pass, ext=%q err=%v", ext, err)
	}
	if ext, err := validateEnterpriseLogoBytes(encodeTestJPEG(t, 64, 64)); err != nil || ext != ".jpg" {
		t.Fatalf("expected jpeg to pass, ext=%q err=%v", ext, err)
	}
}

func TestValidateEnterpriseLogoBytesRejectsSVGAndOversizedDimensions(t *testing.T) {
	if _, err := validateEnterpriseLogoBytes([]byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`)); err == nil {
		t.Fatal("expected svg payload to be rejected")
	}

	_, err := validateEnterpriseLogoBytes(encodeTestPNG(t, maxEnterpriseLogoDimension+1, 32))
	if err == nil || !strings.Contains(err.Error(), "no larger") {
		t.Fatalf("expected oversized logo to be rejected, got %v", err)
	}
}

func TestEnterpriseLogoStoragePathFromURLOnlyAllowsManagedLogoFiles(t *testing.T) {
	validPath, ok := enterpriseLogoStoragePathFromURL("/uploads/enterprise-logo-abc.png")
	if !ok || filepath.ToSlash(validPath) != "uploads/enterprise-logo-abc.png" {
		t.Fatalf("expected managed logo URL to resolve, path=%q ok=%v", validPath, ok)
	}

	invalidURLs := []string{
		"",
		"/brand/hackgripe.png",
		"/uploads/asset.png",
		"/uploads/enterprise-logo-abc.svg",
		"/uploads/enterprise-logo-../secret.png",
		"/uploads/nested/enterprise-logo-abc.png",
		`/uploads/enterprise-logo-abc\evil.png`,
	}

	for _, logoURL := range invalidURLs {
		if path, ok := enterpriseLogoStoragePathFromURL(logoURL); ok {
			t.Fatalf("expected %q to be rejected, got path %q", logoURL, path)
		}
	}
}
