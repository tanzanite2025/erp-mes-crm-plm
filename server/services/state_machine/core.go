package statemachine

import "fmt"

type GuardResult struct {
	Allowed    bool
	ReasonCode string
	Reason     string
}

type GuardError struct {
	ReasonCode string
	Reason     string
}

func Allow() GuardResult {
	return GuardResult{Allowed: true}
}

func Deny(reasonCode string, reason string) GuardResult {
	return GuardResult{
		Allowed:    false,
		ReasonCode: reasonCode,
		Reason:     reason,
	}
}

func (result GuardResult) Err() error {
	if result.Allowed {
		return nil
	}
	return GuardError{
		ReasonCode: result.ReasonCode,
		Reason:     result.Reason,
	}
}

func (err GuardError) Error() string {
	if err.ReasonCode == "" {
		return err.Reason
	}
	if err.Reason == "" {
		return err.ReasonCode
	}
	return fmt.Sprintf("%s: %s", err.ReasonCode, err.Reason)
}
