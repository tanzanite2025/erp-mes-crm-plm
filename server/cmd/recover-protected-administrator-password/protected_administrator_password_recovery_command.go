package main

import (
	"bytes"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"
	"xdfc-server/security"
	"xdfc-server/services"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/term"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const protectedAdministratorRecoveryCommandUsage = `Usage: recover-protected-administrator-password --user-id <UUID>

Default: read-only account inspection using the inherited DATABASE_URL.
Apply: add --apply --expected-password-version <number> --operator <identity> --reason <ticket-and-reason>.
Apply requires an interactive terminal, an exact confirmation, and two hidden password entries.
New account passwords are never accepted as command-line flags, environment variables or piped input.
This command never runs migrations, creates accounts, activates accounts or changes permissions.
`

type protectedAdministratorPasswordRecoveryCommandOptions struct {
	apply bool
	input services.ProtectedAdministratorPasswordRecoveryInput
}

type protectedAdministratorPasswordRecoveryInteraction struct {
	readConfirmation   func(string) (string, error)
	readHiddenPassword func(string) ([]byte, error)
}

func main() {
	if err := runProtectedAdministratorPasswordRecoveryCommand(os.Args[1:], os.Stdin, os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func parseProtectedAdministratorPasswordRecoveryCommandOptions(arguments []string) (protectedAdministratorPasswordRecoveryCommandOptions, error) {
	options := protectedAdministratorPasswordRecoveryCommandOptions{}
	flags := flag.NewFlagSet("recover-protected-administrator-password", flag.ContinueOnError)
	flags.SetOutput(io.Discard) // Never echo unrecognized arguments: they might contain a mistakenly supplied password.
	flags.BoolVar(&options.apply, "apply", false, "Apply a protected administrator password recovery")
	flags.StringVar(&options.input.UserID, "user-id", "", "Exact lowercase hyphenated account UUID")
	expectedVersion := flags.String("expected-password-version", "", "Password version observed during read-only inspection")
	flags.StringVar(&options.input.Operator, "operator", "", "Identifiable maintenance operator")
	flags.StringVar(&options.input.Reason, "reason", "", "Non-secret incident reference and recovery reason")
	if err := flags.Parse(arguments); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return options, flag.ErrHelp
		}
		return options, errors.New("invalid recovery arguments; use --help for supported flags")
	}
	if flags.NArg() != 0 || options.input.UserID == "" {
		return options, errors.New("an exact --user-id is required; positional arguments are not accepted")
	}
	if !options.apply {
		return options, nil
	}
	version, err := strconv.ParseInt(*expectedVersion, 10, 64)
	if err != nil {
		return options, errors.New("--apply requires --expected-password-version from the read-only inspection")
	}
	options.input.ExpectedPasswordVersion = version
	if err := services.ValidateProtectedAdministratorPasswordRecoveryRequestMetadata(options.input); err != nil {
		return options, err
	}
	return options, nil
}

// Open only this connection. Application InitDB also migrates/seeds business data and must not be called here.
func openProtectedAdministratorRecoveryDatabase(databaseURL string, readOnly bool) (*gorm.DB, func(), string, error) {
	if strings.TrimSpace(databaseURL) == "" {
		return nil, nil, "", errors.New("DATABASE_URL must be supplied explicitly; no env file or development database fallback is loaded")
	}
	configuration, err := pgx.ParseConfig(databaseURL)
	if err != nil {
		return nil, nil, "", errors.New("DATABASE_URL is invalid; connection details were omitted")
	}
	configuration.ConnectTimeout = 5 * time.Second
	configuration.RuntimeParams["statement_timeout"] = "5000"
	configuration.RuntimeParams["lock_timeout"] = "3000"
	configuration.RuntimeParams["application_name"] = "protected-administrator-password-recovery"
	if readOnly {
		configuration.RuntimeParams["default_transaction_read_only"] = "on"
	}
	connection := stdlib.OpenDB(*configuration)
	connection.SetMaxOpenConns(2)
	connection.SetMaxIdleConns(1)
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent), DisableAutomaticPing: true})
	if err != nil {
		_ = connection.Close()
		return nil, nil, "", errors.New("unable to initialize recovery database connection; connection details were omitted")
	}
	databaseDescription := fmt.Sprintf("host=%q port=%d database=%q", configuration.Host, configuration.Port, configuration.Database)
	return database, func() { _ = connection.Close() }, databaseDescription, nil
}

func runProtectedAdministratorPasswordRecoveryCommand(arguments []string, input *os.File, output io.Writer) error {
	options, err := parseProtectedAdministratorPasswordRecoveryCommandOptions(arguments)
	if errors.Is(err, flag.ErrHelp) {
		_, err = fmt.Fprint(output, protectedAdministratorRecoveryCommandUsage)
		return err
	}
	if err != nil {
		return err
	}
	if options.apply && !term.IsTerminal(int(input.Fd())) {
		return errors.New("--apply requires a real interactive terminal; password files and piped input are not accepted")
	}
	database, closeDatabase, databaseDescription, err := openProtectedAdministratorRecoveryDatabase(os.Getenv("DATABASE_URL"), !options.apply)
	if err != nil {
		return err
	}
	defer closeDatabase()
	inspectionContext, cancelInspection := context.WithTimeout(context.Background(), 10*time.Second)
	target, err := services.InspectProtectedAdministratorPasswordRecoveryTarget(inspectionContext, database, options.input.UserID)
	cancelInspection()
	if err != nil {
		return sanitizeProtectedAdministratorRecoveryFailure(err)
	}
	if _, err := fmt.Fprintf(output, "Database: %s\nTarget: id=%s username=%q passwordVersion=%d\n", databaseDescription, target.UserID, target.Username, target.PasswordVersion); err != nil {
		return err
	}
	if !options.apply {
		_, err := fmt.Fprintln(output, "READ ONLY: no password or account data was changed. Record this version before --apply.")
		return err
	}
	if target.PasswordVersion != options.input.ExpectedPasswordVersion {
		return services.ErrProtectedAdministratorRecoveryVersionChanged
	}
	interaction := protectedAdministratorPasswordRecoveryInteraction{
		readConfirmation: func(prompt string) (string, error) {
			if _, err := fmt.Fprint(output, prompt); err != nil {
				return "", err
			}
			return readProtectedAdministratorRecoveryConfirmationLine(input)
		},
		readHiddenPassword: func(prompt string) ([]byte, error) {
			if _, err := fmt.Fprint(output, prompt); err != nil {
				return nil, err
			}
			password, err := term.ReadPassword(int(input.Fd()))
			_, _ = fmt.Fprintln(output)
			return password, err
		},
	}
	return applyProtectedAdministratorRecoveryAfterExactInteractiveConfirmation(database, options.input, interaction, output)
}

func readProtectedAdministratorRecoveryConfirmationLine(input io.Reader) (string, error) {
	// Read one byte at a time so confirmation does not prefetch a subsequently typed password.
	line := make([]byte, 0, 128)
	for len(line) < 256 {
		var character [1]byte
		if _, err := io.ReadFull(input, character[:]); err != nil {
			return "", errors.New("recovery confirmation was interrupted; no change was made")
		}
		if character[0] == '\n' {
			return strings.TrimSuffix(string(line), "\r"), nil
		}
		line = append(line, character[0])
	}
	return "", errors.New("recovery confirmation exceeded its maximum length; no change was made")
}

func applyProtectedAdministratorRecoveryAfterExactInteractiveConfirmation(database *gorm.DB, request services.ProtectedAdministratorPasswordRecoveryInput, interaction protectedAdministratorPasswordRecoveryInteraction, output io.Writer) error {
	expectedConfirmation := fmt.Sprintf("RECOVER %s VERSION %d", request.UserID, request.ExpectedPasswordVersion)
	confirmation, err := interaction.readConfirmation(fmt.Sprintf("This operation revokes all prior credentials. Type exactly %q: ", expectedConfirmation))
	if err != nil {
		return errors.New("recovery confirmation was interrupted; no change was made")
	}
	if confirmation != expectedConfirmation {
		return errors.New("recovery confirmation did not match; no change was made")
	}
	newPassword, err := interaction.readHiddenPassword("New password (hidden): ")
	defer clear(newPassword)
	if err != nil {
		return errors.New("password entry was interrupted; no change was made")
	}
	if err := security.ValidateNewUserPassword(string(newPassword)); err != nil {
		return err
	}
	confirmationPassword, err := interaction.readHiddenPassword("Confirm new password (hidden): ")
	defer clear(confirmationPassword)
	if err != nil {
		return errors.New("password confirmation was interrupted; no change was made")
	}
	if !bytes.Equal(newPassword, confirmationPassword) {
		return errors.New("passwords did not match; no change was made")
	}
	request.NewPassword = string(newPassword)
	transactionContext, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	result, err := services.RecoverProtectedAdministratorPasswordWithAtomicAudit(transactionContext, database, request)
	if err != nil {
		return sanitizeProtectedAdministratorRecoveryFailure(err)
	}
	if _, err := fmt.Fprintf(output, "RECOVERY COMMITTED: userId=%s passwordVersion=%d operationId=%s\nSign in with the new password and verify old credentials are rejected.\n", result.UserID, result.PasswordVersion, result.RecoveryOperationID); err != nil {
		return errors.New("recovery committed but the result could not be written; inspect the account version before taking further action")
	}
	return nil
}

func sanitizeProtectedAdministratorRecoveryFailure(err error) error {
	for _, knownError := range []error{services.ErrProtectedAdministratorRecoveryInputInvalid, services.ErrProtectedAdministratorRecoveryTargetIneligible, services.ErrProtectedAdministratorRecoveryVersionChanged, services.ErrNewUserPasswordUnchanged, security.ErrNewUserPasswordInvalid} {
		if errors.Is(err, knownError) {
			return knownError
		}
	}
	// Do not expose pgx/SQL errors, which can include the DSN or password hash parameters.
	return errors.New("recovery could not be confirmed; inspect account version and audit history before retrying; database details were omitted")
}
