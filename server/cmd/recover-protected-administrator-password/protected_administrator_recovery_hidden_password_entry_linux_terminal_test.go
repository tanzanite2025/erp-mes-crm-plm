//go:build linux

package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"golang.org/x/sys/unix"
)

func TestProtectedAdministratorRecoveryLinuxTerminalHidesBothPasswordEntries(t *testing.T) {
	commandBinary := os.Getenv("PASSWORD_RECOVERY_TEST_COMMAND_BINARY")
	if commandBinary == "" {
		t.Skip("set PASSWORD_RECOVERY_TEST_COMMAND_BINARY and an isolated PostgreSQL DSN for real Linux terminal verification")
	}
	_, account := openProtectedAdministratorRecoveryCommandTestDatabase(t, true)
	masterDescriptor, err := unix.Open("/dev/ptmx", unix.O_RDWR|unix.O_NOCTTY, 0)
	require.NoError(t, err)
	master := os.NewFile(uintptr(masterDescriptor), "protected-administrator-recovery-test-terminal-master")
	t.Cleanup(func() { _ = master.Close() })
	require.NoError(t, unix.IoctlSetPointerInt(masterDescriptor, unix.TIOCSPTLCK, 0))
	slaveNumber, err := unix.IoctlGetInt(masterDescriptor, unix.TIOCGPTN)
	require.NoError(t, err)
	slave, err := os.OpenFile(fmt.Sprintf("/dev/pts/%d", slaveNumber), os.O_RDWR|unix.O_NOCTTY, 0)
	require.NoError(t, err)
	t.Cleanup(func() { _ = slave.Close() })
	command := exec.Command(commandBinary, "--user-id", account.ID, "--apply", "--expected-password-version", "0", "--operator", "isolated-terminal-verification", "--reason", "TEST disposable Linux terminal verification")
	command.Stdin, command.Stdout, command.Stderr = slave, slave, slave
	require.NoError(t, command.Start())
	commandFinished := make(chan error, 1)
	go func() { commandFinished <- command.Wait() }()
	t.Cleanup(func() { _ = command.Process.Kill() })
	var transcript bytes.Buffer
	waitForProtectedAdministratorRecoveryTerminalPrompt := func(prompt string) {
		deadline := time.Now().Add(15 * time.Second)
		for !strings.Contains(transcript.String(), prompt) {
			if time.Now().After(deadline) {
				t.Fatal("recovery command did not reach the expected terminal prompt; transcript omitted")
			}
			pollDescriptors := []unix.PollFd{{Fd: int32(masterDescriptor), Events: unix.POLLIN}}
			ready, err := unix.Poll(pollDescriptors, 100)
			if errors.Is(err, unix.EINTR) {
				continue
			}
			require.NoError(t, err)
			if ready == 0 {
				continue
			}
			buffer := make([]byte, 4096)
			count, err := master.Read(buffer)
			require.NoError(t, err)
			transcript.Write(buffer[:count])
		}
	}
	enterProtectedAdministratorRecoverySecretWithEchoDisabled := func(password string) {
		deadline := time.Now().Add(3 * time.Second)
		for {
			terminalState, err := unix.IoctlGetTermios(int(slave.Fd()), unix.TCGETS)
			require.NoError(t, err)
			if terminalState.Lflag&unix.ECHO == 0 {
				break
			}
			if time.Now().After(deadline) {
				t.Fatal("password entry did not disable terminal echo")
			}
			time.Sleep(time.Millisecond)
		}
		_, err := io.WriteString(master, password+"\n")
		require.NoError(t, err)
	}
	waitForProtectedAdministratorRecoveryTerminalPrompt("Type exactly")
	_, err = fmt.Fprintf(master, "RECOVER %s VERSION 0\n", account.ID)
	require.NoError(t, err)
	waitForProtectedAdministratorRecoveryTerminalPrompt("New password (hidden):")
	enterProtectedAdministratorRecoverySecretWithEchoDisabled("terminal-recovered-password2")
	waitForProtectedAdministratorRecoveryTerminalPrompt("Confirm new password (hidden):")
	enterProtectedAdministratorRecoverySecretWithEchoDisabled("terminal-recovered-password2")
	waitForProtectedAdministratorRecoveryTerminalPrompt("RECOVERY COMMITTED")
	select {
	case err := <-commandFinished:
		require.NoError(t, err)
	case <-time.After(5 * time.Second):
		t.Fatal("recovery command did not exit")
	}
	require.False(t, strings.Contains(transcript.String(), "terminal-recovered-password2"), "new password appeared in terminal output; transcript omitted")
	require.False(t, strings.Contains(transcript.String(), "original-admin-password1"), "old password appeared in terminal output; transcript omitted")
	require.Contains(t, transcript.String(), "passwordVersion=1")
}
