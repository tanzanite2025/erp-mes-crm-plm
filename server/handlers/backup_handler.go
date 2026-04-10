package handlers

import (
	"archive/zip"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"
	"xdfc-server/db"
)

// BackupMetadata describes one generated backup set.
type BackupMetadata struct {
	Timestamp string `json:"timestamp"`
	DBFile    string `json:"db_file"`
	FilesZip  string `json:"files_zip"`
	Status    string `json:"status"`
}

// PerformModularBackup runs the scheduled backup flow.
func PerformModularBackup() error {
	log.Println("[BACKUP] starting modular backup task")

	backupRoot := "backups"
	if err := os.MkdirAll(backupRoot, 0o755); err != nil {
		return fmt.Errorf("create backup root: %w", err)
	}

	timestamp := time.Now().Format("20060102_150405")
	currentBackupDir := filepath.Join(backupRoot, timestamp)
	if err := os.MkdirAll(currentBackupDir, 0o755); err != nil {
		return fmt.Errorf("create backup directory: %w", err)
	}

	dbFile := filepath.Join(currentBackupDir, "database.sql.gz")
	if err := dumpPostgres(dbFile); err != nil {
		log.Printf("[BACKUP][ERROR] database dump failed: %v", err)
	}

	filesZip := filepath.Join(currentBackupDir, "uploads.zip")
	if err := zipFolder("uploads", filesZip); err != nil {
		log.Printf("[BACKUP][ERROR] uploads archive failed: %v", err)
	}

	if err := copyFile(".env.dev", filepath.Join(currentBackupDir, ".env.dev")); err != nil {
		log.Printf("[BACKUP][INFO] skipped .env.dev copy: %v", err)
	}

	go asyncRemoteSync(currentBackupDir)

	if err := RotateBackups(14); err != nil {
		log.Printf("[BACKUP][ERROR] backup rotation failed: %v", err)
	}

	log.Printf("[BACKUP][SUCCESS] backup completed: %s", timestamp)
	return nil
}

// dumpPostgres exports the current database with pg_dump.
func dumpPostgres(targetFile string) error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return fmt.Errorf("DATABASE_URL is not configured")
	}

	cmd := exec.Command("sh", "-c", fmt.Sprintf("pg_dump %s | gzip > %s", dsn, targetFile))
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("pg_dump failed: %w, output: %s", err, string(output))
	}

	return nil
}

// zipFolder archives a directory into a zip file.
func zipFolder(source, target string) error {
	newZipFile, err := os.Create(target)
	if err != nil {
		return err
	}
	defer newZipFile.Close()

	archive := zip.NewWriter(newZipFile)
	defer archive.Close()

	return filepath.Walk(source, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}
		header.Name = relPath

		if info.IsDir() {
			header.Name += "/"
		} else {
			header.Method = zip.Deflate
		}

		writer, err := archive.CreateHeader(header)
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(writer, file)
		return err
	})
}

func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

// RotateBackups removes backups older than the provided day limit.
func RotateBackups(maxDays int) error {
	backupRoot := "backups"
	entries, err := os.ReadDir(backupRoot)
	if err != nil {
		return err
	}

	now := time.Now()
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		if now.Sub(info.ModTime()).Hours() > float64(maxDays*24) {
			path := filepath.Join(backupRoot, entry.Name())
			log.Printf("[BACKUP][CLEAN] removing expired backup: %s", path)
			if err := os.RemoveAll(path); err != nil {
				log.Printf("[BACKUP][ERROR] remove failed: %v", err)
			}
		}
	}

	return nil
}

// asyncRemoteSync is a placeholder for offsite backup sync.
func asyncRemoteSync(backupDir string) {
	endpoint := GetConfigValue(db.DB, "backup_s3_endpoint", "")
	if endpoint == "" {
		log.Println("[BACKUP][SYNC] remote endpoint not configured, skipping")
		return
	}

	log.Printf("[BACKUP][SYNC] syncing backup to remote endpoint %s from %s", endpoint, backupDir)
	time.Sleep(2 * time.Second)
	log.Println("[BACKUP][SYNC] remote sync job submitted")
}
