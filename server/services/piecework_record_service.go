package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrInvalidPieceworkRecord = errors.New("invalid piecework record")

type PieceworkRecordCommand struct {
	WorkDate          time.Time
	EmployeeID        string
	TeamID            string
	ProductID         string
	ProductName       string
	RouteID           string
	RouteStepID       string
	ProcessStepID     string
	Quantity          float64
	SourceExecutionID string
}

type PieceworkRecordService struct {
	txManager transactionManager
}

func NewPieceworkRecordService(txManager transactionManager) *PieceworkRecordService {
	return &PieceworkRecordService{txManager: txManager}
}

var defaultPieceworkRecordService = NewPieceworkRecordService(defaultServiceRuntime().txManager)

func RecordPiecework(ctx context.Context, command PieceworkRecordCommand) (models.PieceworkRecord, error) {
	return defaultPieceworkRecordService.RecordPiecework(ctx, command)
}

func (s *PieceworkRecordService) RecordPiecework(
	ctx context.Context,
	command PieceworkRecordCommand,
) (models.PieceworkRecord, error) {
	command = normalizePieceworkRecordCommand(command)
	if err := validatePieceworkRecordCommand(command); err != nil {
		return models.PieceworkRecord{}, err
	}

	var record models.PieceworkRecord
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		created, err := recordPieceworkTx(ctx, tx, command)
		if err != nil {
			return err
		}
		record = created
		return nil
	})
	if err != nil {
		return models.PieceworkRecord{}, err
	}
	return record, nil
}

func recordPieceworkTx(
	ctx context.Context,
	tx *gorm.DB,
	command PieceworkRecordCommand,
) (models.PieceworkRecord, error) {
	command = normalizePieceworkRecordCommand(command)
	if err := validatePieceworkRecordCommand(command); err != nil {
		return models.PieceworkRecord{}, err
	}

	if command.SourceExecutionID != "" {
		var existing models.PieceworkRecord
		err := tx.Where("source_execution_id = ?", command.SourceExecutionID).First(&existing).Error
		if err == nil {
			return existing, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return models.PieceworkRecord{}, err
		}
	}

	match, err := (&PieceworkRateResolver{db: tx}).Resolve(ctx, PieceworkRateLookup{
		ProductID:     command.ProductID,
		RouteStepID:   command.RouteStepID,
		ProcessStepID: command.ProcessStepID,
		At:            command.WorkDate,
	})
	if err != nil {
		if errors.Is(err, ErrPieceworkRateNotFound) {
			return models.PieceworkRecord{}, fmt.Errorf("%w: no active rate matched the work identity", ErrInvalidPieceworkRecord)
		}
		return models.PieceworkRecord{}, err
	}

	record := models.PieceworkRecord{
		BaseModel:         models.BaseModel{ID: uuid.NewString()},
		WorkDate:          command.WorkDate,
		EmployeeID:        command.EmployeeID,
		TeamID:            command.TeamID,
		ProductID:         command.ProductID,
		ProductName:       command.ProductName,
		RouteID:           command.RouteID,
		RouteStepID:       command.RouteStepID,
		ProcessStepID:     command.ProcessStepID,
		ProcessCode:       match.Rate.ProcessCode,
		ProcessName:       match.Rate.ProcessName,
		RateID:            match.Rate.ID,
		RateVersion:       match.Rate.Version,
		Quantity:          command.Quantity,
		Unit:              match.Rate.Unit,
		Currency:          match.Rate.Currency,
		UnitPrice:         match.Rate.UnitPrice,
		TotalAmount:       command.Quantity * match.Rate.UnitPrice,
		SourceExecutionID: command.SourceExecutionID,
	}
	if err := tx.Create(&record).Error; err != nil {
		return models.PieceworkRecord{}, err
	}
	return record, nil
}

func normalizePieceworkRecordCommand(command PieceworkRecordCommand) PieceworkRecordCommand {
	if command.WorkDate.IsZero() {
		command.WorkDate = time.Now().UTC()
	} else {
		command.WorkDate = command.WorkDate.UTC()
	}
	command.EmployeeID = strings.TrimSpace(command.EmployeeID)
	command.TeamID = strings.TrimSpace(command.TeamID)
	command.ProductID = strings.TrimSpace(command.ProductID)
	command.ProductName = strings.TrimSpace(command.ProductName)
	command.RouteID = strings.TrimSpace(command.RouteID)
	command.RouteStepID = strings.TrimSpace(command.RouteStepID)
	command.ProcessStepID = strings.TrimSpace(command.ProcessStepID)
	command.SourceExecutionID = strings.TrimSpace(command.SourceExecutionID)
	return command
}

func validatePieceworkRecordCommand(command PieceworkRecordCommand) error {
	if command.ProductID == "" {
		return fmt.Errorf("%w: productId is required", ErrInvalidPieceworkRecord)
	}
	if command.ProcessStepID == "" {
		return fmt.Errorf("%w: processStepId is required", ErrInvalidPieceworkRecord)
	}
	if command.Quantity <= 0 {
		return fmt.Errorf("%w: quantity must be greater than zero", ErrInvalidPieceworkRecord)
	}
	return nil
}
