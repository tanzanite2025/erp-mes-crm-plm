package db

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestInitDBDoesNotDropProductionRouteStepsDuringStartupMigration(t *testing.T) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("failed to locate db package source")
	}

	sourcePath := filepath.Join(filepath.Dir(currentFile), "db.go")
	source, err := os.ReadFile(sourcePath)
	if err != nil {
		t.Fatalf("read db.go: %v", err)
	}

	if strings.Contains(string(source), "DROP TABLE IF EXISTS production_route_steps") {
		t.Fatal("startup migration must not drop production_route_steps")
	}
	if strings.Contains(string(source), "prepareProductionTopologySchema()") {
		t.Fatal("startup migration must not call prepareProductionTopologySchema")
	}
}
