package bridge

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	"xdfc-attendance-gateway/internal/config"
	"xdfc-attendance-gateway/internal/model"
)

type Sink interface {
	HandleBridgeMessage(context.Context, model.BridgeMessage) error
}

type Process struct {
	command string
	args    []string
	workDir string
	token   string
	api     string
	config  string
	logger  *log.Logger
	sink    Sink
}

func NewProcess(cfg config.Config, logger *log.Logger, sink Sink) *Process {
	return &Process{
		command: cfg.SDKBridgeCommand,
		args:    append([]string(nil), cfg.SDKBridgeArgs...),
		workDir: cfg.SDKBridgeWorkDir,
		token:   cfg.BridgeToken,
		api:     cfg.SDKBridgeAPI,
		config:  cfg.ConfigFile,
		logger:  logger,
		sink:    sink,
	}
}

func (p *Process) Run(ctx context.Context) {
	if strings.TrimSpace(p.command) == "" {
		p.logger.Println("未配置 sdkBridgeCommand，仅启用本地 Bridge HTTP 接口")
		return
	}

	backoff := 2 * time.Second
	for {
		if ctx.Err() != nil {
			return
		}
		err := p.runOnce(ctx)
		if ctx.Err() != nil {
			return
		}
		p.logger.Printf("官方 SDK Bridge 已退出: %v；%s 后重启", err, backoff)
		timer := time.NewTimer(backoff)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

func (p *Process) runOnce(ctx context.Context) error {
	command := exec.CommandContext(ctx, p.command, p.args...)
	command.Dir = p.workDir
	command.Stderr = p.logger.Writer()
	// The native Bridge reads this same deployment config to obtain the
	// registration ID and ISUP Key. ERP device-page changes do not rewrite this
	// file; operators must update it and restart Gateway after credential or
	// device-code changes.
	command.Env = append(os.Environ(),
		"ISUP_GATEWAY_BRIDGE_TOKEN="+p.token,
		"ISUP_GATEWAY_BRIDGE_API="+p.api,
		"ISUP_GATEWAY_BRIDGE_CONTRACT=jsonl-v1",
		"ISUP_GATEWAY_CONFIG_FILE="+p.config,
	)

	stdout, err := command.StdoutPipe()
	if err != nil {
		return fmt.Errorf("打开 SDK Bridge 输出失败: %w", err)
	}
	if err := command.Start(); err != nil {
		return fmt.Errorf("启动 SDK Bridge 失败: %w", err)
	}

	err = p.consume(ctx, stdout)
	waitErr := command.Wait()
	if err != nil && !errors.Is(err, io.EOF) {
		return err
	}
	if waitErr != nil {
		return waitErr
	}
	return errors.New("SDK Bridge 正常退出")
}

func (p *Process) consume(ctx context.Context, reader io.Reader) error {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 64*1024), 4*1024*1024)
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var message model.BridgeMessage
		if err := json.Unmarshal([]byte(line), &message); err != nil {
			p.logger.Printf("忽略无法解析的 SDK Bridge 输出: %v", err)
			continue
		}
		if message.Type == "" {
			p.logger.Println("忽略缺少 type 的 SDK Bridge 消息")
			continue
		}
		if err := p.sink.HandleBridgeMessage(ctx, message); err != nil {
			p.logger.Printf("处理 SDK Bridge 消息失败: %v", err)
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("读取 SDK Bridge 输出失败: %w", err)
	}
	return io.EOF
}
