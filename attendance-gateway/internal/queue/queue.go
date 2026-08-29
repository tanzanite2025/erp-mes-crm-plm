package queue

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type Item struct {
	ID         string          `json:"id"`
	Kind       string          `json:"kind"`
	DeviceCode string          `json:"deviceCode"`
	Payload    json.RawMessage `json:"payload"`
	CreatedAt  time.Time       `json:"createdAt"`
	Attempts   int             `json:"attempts"`
	LastError  string          `json:"lastError,omitempty"`
}

type Store struct {
	dir              string
	deadDir          string
	maxQueueItems    int
	maxRetryAttempts int
	mu               sync.Mutex
}

func New(dir, deadDir string, maxQueueItems, maxRetryAttempts int) (*Store, error) {
	if err := os.MkdirAll(dir, 0750); err != nil {
		return nil, fmt.Errorf("创建网关队列目录失败: %w", err)
	}
	if err := os.MkdirAll(deadDir, 0750); err != nil {
		return nil, fmt.Errorf("创建网关死信目录失败: %w", err)
	}
	return &Store{
		dir:              dir,
		deadDir:          deadDir,
		maxQueueItems:    maxQueueItems,
		maxRetryAttempts: maxRetryAttempts,
	}, nil
}

func (s *Store) Enqueue(kind, deviceCode string, payload interface{}) (Item, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	files, err := s.pendingFilesLocked()
	if err != nil {
		return Item{}, err
	}
	if s.maxQueueItems > 0 && len(files) >= s.maxQueueItems {
		return Item{}, fmt.Errorf("网关离线队列已达到上限 %d", s.maxQueueItems)
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return Item{}, fmt.Errorf("编码离线队列消息失败: %w", err)
	}
	item := Item{
		ID:         newID(),
		Kind:       kind,
		DeviceCode: deviceCode,
		Payload:    raw,
		CreatedAt:  time.Now().UTC(),
	}
	if err := s.writeLocked(item, s.dir); err != nil {
		return Item{}, err
	}
	return item, nil
}

func (s *Store) List() ([]Item, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	files, err := s.pendingFilesLocked()
	if err != nil {
		return nil, err
	}
	items := make([]Item, 0, len(files))
	for _, file := range files {
		raw, readErr := os.ReadFile(file)
		if readErr != nil {
			continue
		}
		var item Item
		if unmarshalErr := json.Unmarshal(raw, &item); unmarshalErr != nil {
			continue
		}
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.Before(items[j].CreatedAt)
	})
	return items, nil
}

func (s *Store) Remove(item Item) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return os.Remove(filepath.Join(s.dir, item.ID+".json"))
}

func (s *Store) RecordFailure(item Item, message string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	item.Attempts++
	item.LastError = truncate(message, 1000)
	if item.Attempts >= s.maxRetryAttempts && s.maxRetryAttempts > 0 {
		return s.moveToDeadLocked(item)
	}
	if err := os.Remove(filepath.Join(s.dir, item.ID+".json")); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("更新队列文件前删除旧文件失败: %w", err)
	}
	return s.writeLocked(item, s.dir)
}

func (s *Store) MoveToDead(item Item, message string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	item.LastError = truncate(message, 1000)
	return s.moveToDeadLocked(item)
}

func (s *Store) Count() (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	files, err := s.pendingFilesLocked()
	return len(files), err
}

func (s *Store) pendingFilesLocked() ([]string, error) {
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		return nil, fmt.Errorf("读取网关离线队列失败: %w", err)
	}
	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		files = append(files, filepath.Join(s.dir, entry.Name()))
	}
	sort.Strings(files)
	return files, nil
}

func (s *Store) writeLocked(item Item, dir string) error {
	raw, err := json.MarshalIndent(item, "", "  ")
	if err != nil {
		return fmt.Errorf("编码队列文件失败: %w", err)
	}
	tempPath := filepath.Join(dir, "."+item.ID+".tmp")
	finalPath := filepath.Join(dir, item.ID+".json")
	if err := os.WriteFile(tempPath, raw, 0600); err != nil {
		return fmt.Errorf("写入队列文件失败: %w", err)
	}
	if err := os.Rename(tempPath, finalPath); err != nil {
		_ = os.Remove(tempPath)
		return fmt.Errorf("提交队列文件失败: %w", err)
	}
	return nil
}

func (s *Store) moveToDeadLocked(item Item) error {
	if err := os.Remove(filepath.Join(s.dir, item.ID+".json")); err != nil && !os.IsNotExist(err) {
		return err
	}
	return s.writeLocked(item, s.deadDir)
}

func newID() string {
	random := make([]byte, 8)
	if _, err := rand.Read(random); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return fmt.Sprintf("%s-%d", hex.EncodeToString(random), time.Now().UnixNano())
}

func truncate(value string, max int) string {
	value = strings.TrimSpace(value)
	if len(value) <= max {
		return value
	}
	return value[:max]
}
