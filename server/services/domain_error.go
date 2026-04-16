package services

import "fmt"

type DomainErrorKind string

const (
	DomainErrorValidation DomainErrorKind = "VALIDATION"
	DomainErrorConflict   DomainErrorKind = "CONFLICT"
	DomainErrorNotFound   DomainErrorKind = "NOT_FOUND"
)

func domainError(kind DomainErrorKind, message string) error {
	return fmt.Errorf("[%s] %s", kind, message)
}

func domainValidationError(message string) error { return domainError(DomainErrorValidation, message) }
func domainConflictError(message string) error   { return domainError(DomainErrorConflict, message) }
func domainNotFoundError(message string) error   { return domainError(DomainErrorNotFound, message) }

func isDomainError(err error, kind DomainErrorKind) bool {
	if err == nil {
		return false
	}
	prefix := fmt.Sprintf("[%s]", kind)
	return len(err.Error()) >= len(prefix) && err.Error()[:len(prefix)] == prefix
}
