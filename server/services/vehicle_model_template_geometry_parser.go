package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	vehicleModelTemplateGeometrySchemaVersion           = "vehicle-geometry.v1"
	vehicleModelTemplateGeometryParserExecutableEnvName = "VEHICLE_GEOMETRY_PARSER_BIN"
	vehicleModelTemplateGeometryParserDefaultTimeout    = 20 * time.Second
	vehicleModelTemplateGeometryParserMaximumOutput     = int64(4 << 20)
	vehicleModelTemplateGeometryMaximumPartCount        = 256
)

var (
	ErrVehicleModelTemplateSourceAssetFileNotFound = errors.New("vehicle model template source asset file not found")
	ErrVehicleModelTemplateParserUnavailable       = errors.New("vehicle geometry parser executable is unavailable")
	ErrVehicleModelTemplateParserFailed            = errors.New("vehicle geometry parser failed")
	ErrVehicleModelTemplateParsedGeometryInvalid   = errors.New("vehicle geometry parser result is invalid")
	ErrVehicleModelTemplateChangedDuringParse      = errors.New("vehicle model template changed during parse")
)

type ParseVehicleModelTemplateGeometryRequest struct {
	ActorID  string
	Operator string
	IP       string
}

type ParseVehicleModelTemplateGeometryResponse struct {
	Template VehicleModelTemplateResponse `json:"template"`
	Geometry json.RawMessage              `json:"geometry"`
}

type VehicleModelTemplateGeometryParserRuntimeStatus struct {
	Available      bool
	ExecutablePath string
	Detail         string
}

type VehicleModelTemplateGeometryParserRunner interface {
	ParseVehicleModelTemplateGLB(
		ctx context.Context,
		sourceFilePath string,
	) (json.RawMessage, error)
}

type VehicleModelTemplateGeometryParserCLIRunner struct {
	ExecutablePath string
	Timeout        time.Duration
	MaxOutputBytes int64
}

type VehicleModelTemplateParsedGeometry struct {
	SchemaVersion    string                                      `json:"schemaVersion"`
	SourceFormat     string                                      `json:"sourceFormat"`
	Unit             string                                      `json:"unit"`
	CoordinateSystem VehicleModelTemplateParsedCoordinateSystem  `json:"coordinateSystem"`
	Bounds           VehicleModelTemplateParsedAxisAlignedBounds `json:"bounds"`
	Parts            []VehicleModelTemplateParsedGeometryPart    `json:"parts"`
	Warnings         []VehicleModelTemplateParsedGeometryWarning `json:"warnings"`
}

type VehicleModelTemplateParsedCoordinateSystem struct {
	LengthAxis string `json:"lengthAxis"`
	WidthAxis  string `json:"widthAxis"`
	HeightAxis string `json:"heightAxis"`
}

type VehicleModelTemplateParsedAxisAlignedBounds struct {
	MinMm    [3]float64 `json:"minMm"`
	MaxMm    [3]float64 `json:"maxMm"`
	LengthMm float64    `json:"lengthMm"`
	WidthMm  float64    `json:"widthMm"`
	HeightMm float64    `json:"heightMm"`
}

type VehicleModelTemplateParsedGeometryPart struct {
	ID          string                                      `json:"id"`
	Kind        string                                      `json:"kind"`
	Collision   string                                      `json:"collision"`
	Bounds      VehicleModelTemplateParsedAxisAlignedBounds `json:"bounds"`
	PositionMm  [3]float64                                  `json:"positionMm"`
	NodeIndex   int                                         `json:"nodeIndex"`
	MeshIndex   int                                         `json:"meshIndex"`
	VertexCount int                                         `json:"vertexCount"`
}

type VehicleModelTemplateParsedGeometryWarning struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	PartID  string `json:"partId,omitempty"`
}

type vehicleModelTemplateBoundedCommandOutputBuffer struct {
	maximumBytes int64
	buffer       bytes.Buffer
	overflowed   bool
}

var vehicleModelTemplateGeometryParserRunner VehicleModelTemplateGeometryParserRunner = VehicleModelTemplateGeometryParserCLIRunner{}

func (runner VehicleModelTemplateGeometryParserCLIRunner) ParseVehicleModelTemplateGLB(
	ctx context.Context,
	sourceFilePath string,
) (json.RawMessage, error) {
	executablePath := runner.resolvedExecutablePath()
	timeout := runner.Timeout
	if timeout <= 0 {
		timeout = vehicleModelTemplateGeometryParserDefaultTimeout
	}
	maxOutputBytes := runner.MaxOutputBytes
	if maxOutputBytes <= 0 {
		maxOutputBytes = vehicleModelTemplateGeometryParserMaximumOutput
	}

	commandContext, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	command := exec.CommandContext(commandContext, executablePath, "--input", sourceFilePath)
	stdout := &vehicleModelTemplateBoundedCommandOutputBuffer{maximumBytes: maxOutputBytes}
	stderr := &vehicleModelTemplateBoundedCommandOutputBuffer{maximumBytes: 64 << 10}
	command.Stdout = stdout
	command.Stderr = stderr

	if err := command.Run(); err != nil {
		if errors.Is(commandContext.Err(), context.DeadlineExceeded) {
			return nil, fmt.Errorf("%w: timeout after %s", ErrVehicleModelTemplateParserFailed, timeout)
		}
		if errors.Is(err, exec.ErrNotFound) || errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("%w: %s", ErrVehicleModelTemplateParserUnavailable, executablePath)
		}

		message := stderr.trimmedString()
		if message == "" {
			message = err.Error()
		}
		return nil, fmt.Errorf("%w: %s", ErrVehicleModelTemplateParserFailed, message)
	}

	if stdout.overflowed {
		return nil, fmt.Errorf(
			"%w: parser output exceeds %d bytes",
			ErrVehicleModelTemplateParserFailed,
			maxOutputBytes,
		)
	}
	output := bytes.TrimSpace(stdout.buffer.Bytes())
	if len(output) == 0 {
		return nil, fmt.Errorf("%w: empty parser output", ErrVehicleModelTemplateParserFailed)
	}

	result := make([]byte, len(output))
	copy(result, output)
	return json.RawMessage(result), nil
}

func (runner VehicleModelTemplateGeometryParserCLIRunner) resolvedExecutablePath() string {
	if trimmed := strings.TrimSpace(runner.ExecutablePath); trimmed != "" {
		return trimmed
	}
	if trimmed := strings.TrimSpace(os.Getenv(vehicleModelTemplateGeometryParserExecutableEnvName)); trimmed != "" {
		return trimmed
	}

	executableFileName := "xdfc-vehicle-geometry-parser"
	if runtime.GOOS == "windows" {
		executableFileName += ".exe"
	}
	candidates := []string{
		filepath.Join("vehicle-loading-engine", "target", "release", executableFileName),
		filepath.Join("vehicle-loading-engine", "target", "debug", executableFileName),
		filepath.Join("..", "vehicle-loading-engine", "target", "release", executableFileName),
		filepath.Join("..", "vehicle-loading-engine", "target", "debug", executableFileName),
		filepath.Join("/app", "xdfc-vehicle-geometry-parser"),
	}
	for _, candidate := range candidates {
		if fileInfo, err := os.Stat(candidate); err == nil && !fileInfo.IsDir() {
			return candidate
		}
	}
	return executableFileName
}

func InspectVehicleModelTemplateGeometryParserRuntimeStatus() VehicleModelTemplateGeometryParserRuntimeStatus {
	executablePath := VehicleModelTemplateGeometryParserCLIRunner{}.resolvedExecutablePath()
	if executablePath == "" {
		return VehicleModelTemplateGeometryParserRuntimeStatus{
			Available: false,
			Detail:    "parser executable path is empty",
		}
	}

	if filepath.IsAbs(executablePath) || strings.ContainsAny(executablePath, `/\`) {
		fileInfo, err := os.Stat(executablePath)
		if err != nil {
			return VehicleModelTemplateGeometryParserRuntimeStatus{
				Available:      false,
				ExecutablePath: executablePath,
				Detail:         err.Error(),
			}
		}
		if fileInfo.IsDir() {
			return VehicleModelTemplateGeometryParserRuntimeStatus{
				Available:      false,
				ExecutablePath: executablePath,
				Detail:         "parser executable path points to a directory",
			}
		}
		return VehicleModelTemplateGeometryParserRuntimeStatus{
			Available:      true,
			ExecutablePath: executablePath,
			Detail:         executablePath,
		}
	}

	resolvedPath, err := exec.LookPath(executablePath)
	if err != nil {
		return VehicleModelTemplateGeometryParserRuntimeStatus{
			Available:      false,
			ExecutablePath: executablePath,
			Detail:         err.Error(),
		}
	}
	return VehicleModelTemplateGeometryParserRuntimeStatus{
		Available:      true,
		ExecutablePath: resolvedPath,
		Detail:         resolvedPath,
	}
}

func (buffer *vehicleModelTemplateBoundedCommandOutputBuffer) Write(payload []byte) (int, error) {
	if buffer.maximumBytes <= 0 {
		_, _ = buffer.buffer.Write(payload)
		return len(payload), nil
	}

	remaining := int(buffer.maximumBytes) - buffer.buffer.Len()
	if remaining > 0 {
		if len(payload) <= remaining {
			_, _ = buffer.buffer.Write(payload)
			return len(payload), nil
		}
		_, _ = buffer.buffer.Write(payload[:remaining])
	}
	buffer.overflowed = true
	return len(payload), nil
}

func (buffer *vehicleModelTemplateBoundedCommandOutputBuffer) trimmedString() string {
	return strings.TrimSpace(buffer.buffer.String())
}

func ParseVehicleModelTemplateGeometry(
	ctx context.Context,
	templateID string,
	request ParseVehicleModelTemplateGeometryRequest,
) (ParseVehicleModelTemplateGeometryResponse, error) {
	trimmedTemplateID := strings.TrimSpace(templateID)
	if trimmedTemplateID == "" {
		return ParseVehicleModelTemplateGeometryResponse{}, ErrVehicleModelTemplateNotFound
	}

	var templateBeforeParse models.LogisticsVehicleModelTemplate
	if err := db.DB.First(&templateBeforeParse, "id = ?", trimmedTemplateID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ParseVehicleModelTemplateGeometryResponse{}, ErrVehicleModelTemplateNotFound
		}
		return ParseVehicleModelTemplateGeometryResponse{}, err
	}
	if !strings.EqualFold(templateBeforeParse.SourceFormat, "glb") {
		return ParseVehicleModelTemplateGeometryResponse{}, ErrVehicleModelTemplateSourceFormatInvalid
	}

	sourceFilePath, err := resolveVehicleModelTemplateLocalSourceAssetFilePath(
		templateBeforeParse.SourceAssetURL,
	)
	if err != nil {
		return ParseVehicleModelTemplateGeometryResponse{}, err
	}

	rawGeometry, err := vehicleModelTemplateGeometryParserRunner.ParseVehicleModelTemplateGLB(
		ctx,
		sourceFilePath,
	)
	if err != nil {
		return ParseVehicleModelTemplateGeometryResponse{}, err
	}

	parsedGeometry, canonicalGeometry, normalizedFootprint, err :=
		validateVehicleModelTemplateParsedGeometry(rawGeometry)
	if err != nil {
		return ParseVehicleModelTemplateGeometryResponse{}, err
	}

	var recordAfterParse models.LogisticsVehicleModelTemplate
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		var current models.LogisticsVehicleModelTemplate
		if err := tx.First(&current, "id = ?", trimmedTemplateID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrVehicleModelTemplateNotFound
			}
			return err
		}
		if current.SourceAssetURL != templateBeforeParse.SourceAssetURL ||
			current.SourceAssetName != templateBeforeParse.SourceAssetName ||
			current.SourceFormat != templateBeforeParse.SourceFormat ||
			current.Version != templateBeforeParse.Version {
			return ErrVehicleModelTemplateChangedDuringParse
		}

		previous := current
		current.Status = "normalized"
		current.NormalizedLengthMm = normalizedFootprint.LengthMm
		current.NormalizedWidthMm = normalizedFootprint.WidthMm
		current.NormalizedHeightMm = normalizedFootprint.HeightMm

		nextVersion, err := nextVehicleModelTemplateVersionNumberTx(tx, current.ID, current.Version)
		if err != nil {
			return err
		}
		current.Version = nextVersion

		if err := tx.Save(&current).Error; err != nil {
			return err
		}
		if err := createVehicleModelTemplateVersionSnapshotWithGeometryTx(
			tx,
			current,
			canonicalGeometry,
		); err != nil {
			return err
		}

		recordAfterParse = current
		return recordVehicleModelTemplateAuditEventTx(
			tx,
			audit.AuditActionStatus,
			&previous,
			current,
			SaveVehicleModelTemplateRequest{
				ActorID:  request.ActorID,
				Operator: request.Operator,
				IP:       request.IP,
			},
			map[string]string{
				"parserSchemaVersion": parsedGeometry.SchemaVersion,
				"parserSourceFormat":  parsedGeometry.SourceFormat,
				"geometryPartCount":   fmt.Sprintf("%d", len(parsedGeometry.Parts)),
			},
		)
	}); err != nil {
		return ParseVehicleModelTemplateGeometryResponse{}, err
	}

	seedVehicle, err := findVehicleModelTemplateSeedVehicle(recordAfterParse.SeedVehicleSpecID)
	if err != nil {
		return ParseVehicleModelTemplateGeometryResponse{}, err
	}
	versionCounts, err := countVehicleModelTemplateVersionsByTemplateID(db.DB, []string{recordAfterParse.ID})
	if err != nil {
		return ParseVehicleModelTemplateGeometryResponse{}, err
	}

	return ParseVehicleModelTemplateGeometryResponse{
		Template: mapVehicleModelTemplateResponse(
			recordAfterParse,
			seedVehicle.Name,
			versionCounts[recordAfterParse.ID],
		),
		Geometry: canonicalGeometry,
	}, nil
}

func resolveVehicleModelTemplateLocalSourceAssetFilePath(sourceAssetURL string) (string, error) {
	if err := validateVehicleModelTemplateSourceURL(sourceAssetURL); err != nil {
		return "", err
	}

	fileName, ok := vehicleModelTemplateSourceFileNameFromURL(sourceAssetURL)
	if !ok {
		return "", ErrVehicleModelTemplateSourceURLInvalid
	}
	fullPath := filepath.Join("uploads", fileName)
	fileInfo, err := os.Stat(fullPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", ErrVehicleModelTemplateSourceAssetFileNotFound
		}
		return "", err
	}
	if fileInfo.IsDir() {
		return "", ErrVehicleModelTemplateSourceAssetFileNotFound
	}
	return fullPath, nil
}

func validateVehicleModelTemplateParsedGeometry(
	rawGeometry json.RawMessage,
) (VehicleModelTemplateParsedGeometry, json.RawMessage, VehicleModelTemplateFootprint, error) {
	var geometry VehicleModelTemplateParsedGeometry
	if len(bytes.TrimSpace(rawGeometry)) == 0 {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{},
			fmt.Errorf("%w: empty parser result", ErrVehicleModelTemplateParsedGeometryInvalid)
	}
	if err := json.Unmarshal(rawGeometry, &geometry); err != nil {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{},
			fmt.Errorf("%w: %s", ErrVehicleModelTemplateParsedGeometryInvalid, err)
	}

	if geometry.SchemaVersion != vehicleModelTemplateGeometrySchemaVersion {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{},
			fmt.Errorf(
				"%w: schemaVersion must be %s",
				ErrVehicleModelTemplateParsedGeometryInvalid,
				vehicleModelTemplateGeometrySchemaVersion,
			)
	}
	if !strings.EqualFold(strings.TrimSpace(geometry.SourceFormat), "glb") {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{},
			fmt.Errorf("%w: sourceFormat must be glb", ErrVehicleModelTemplateParsedGeometryInvalid)
	}
	if strings.TrimSpace(geometry.Unit) != "mm" {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{},
			fmt.Errorf("%w: unit must be mm", ErrVehicleModelTemplateParsedGeometryInvalid)
	}
	if err := validateVehicleModelTemplateCoordinateSystem(geometry.CoordinateSystem); err != nil {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{}, err
	}
	if err := validateVehicleModelTemplateParsedAxisAlignedBounds(
		geometry.Bounds,
		true,
		"bounds",
	); err != nil {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{}, err
	}
	if len(geometry.Parts) == 0 {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{},
			fmt.Errorf("%w: parts must not be empty", ErrVehicleModelTemplateParsedGeometryInvalid)
	}
	if len(geometry.Parts) > vehicleModelTemplateGeometryMaximumPartCount {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{},
			fmt.Errorf(
				"%w: parts count %d exceeds %d",
				ErrVehicleModelTemplateParsedGeometryInvalid,
				len(geometry.Parts),
				vehicleModelTemplateGeometryMaximumPartCount,
			)
	}

	hasUsableSpace := false
	for _, part := range geometry.Parts {
		if err := validateVehicleModelTemplateParsedGeometryPart(part); err != nil {
			return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{}, err
		}
		if part.Kind == "usable-space" {
			hasUsableSpace = true
			if err := validateVehicleModelTemplateParsedAxisAlignedBounds(
				part.Bounds,
				true,
				"usable-space bounds",
			); err != nil {
				return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{}, err
			}
		}
	}
	if !hasUsableSpace {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{},
			fmt.Errorf("%w: usable-space part is required", ErrVehicleModelTemplateParsedGeometryInvalid)
	}

	for _, warning := range geometry.Warnings {
		if strings.TrimSpace(warning.Code) == "" || strings.TrimSpace(warning.Message) == "" {
			return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{},
				fmt.Errorf("%w: warning code and message are required", ErrVehicleModelTemplateParsedGeometryInvalid)
		}
	}

	footprint, err := vehicleModelTemplateFootprintFromParsedGeometryBounds(geometry.Bounds)
	if err != nil {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{}, err
	}
	canonicalGeometry, err := json.Marshal(geometry)
	if err != nil {
		return VehicleModelTemplateParsedGeometry{}, nil, VehicleModelTemplateFootprint{}, err
	}
	return geometry, canonicalGeometry, footprint, nil
}

func validateVehicleModelTemplateCoordinateSystem(
	coordinateSystem VehicleModelTemplateParsedCoordinateSystem,
) error {
	if coordinateSystem.LengthAxis != "x" ||
		coordinateSystem.WidthAxis != "y" ||
		coordinateSystem.HeightAxis != "z" {
		return fmt.Errorf(
			"%w: coordinateSystem must be x/y/z",
			ErrVehicleModelTemplateParsedGeometryInvalid,
		)
	}
	return nil
}

func validateVehicleModelTemplateParsedGeometryPart(
	part VehicleModelTemplateParsedGeometryPart,
) error {
	if strings.TrimSpace(part.ID) == "" {
		return fmt.Errorf("%w: part id is required", ErrVehicleModelTemplateParsedGeometryInvalid)
	}
	switch part.Kind {
	case "usable-space", "obstacle", "keep-out", "door", "reference":
	default:
		return fmt.Errorf("%w: unsupported part kind %s", ErrVehicleModelTemplateParsedGeometryInvalid, part.Kind)
	}
	switch part.Collision {
	case "aabb", "none":
	default:
		return fmt.Errorf(
			"%w: unsupported part collision %s",
			ErrVehicleModelTemplateParsedGeometryInvalid,
			part.Collision,
		)
	}
	if part.VertexCount <= 0 {
		return fmt.Errorf("%w: part vertexCount must be positive", ErrVehicleModelTemplateParsedGeometryInvalid)
	}
	if part.NodeIndex < 0 || part.MeshIndex < 0 {
		return fmt.Errorf("%w: part nodeIndex and meshIndex must be nonnegative", ErrVehicleModelTemplateParsedGeometryInvalid)
	}
	if err := validateVehicleModelTemplateParsedAxisAlignedBounds(
		part.Bounds,
		false,
		"part bounds",
	); err != nil {
		return err
	}
	if !vehicleModelTemplateAllCoordinatesAreFinite(part.PositionMm) {
		return fmt.Errorf("%w: part positionMm must be finite", ErrVehicleModelTemplateParsedGeometryInvalid)
	}
	return nil
}

func validateVehicleModelTemplateParsedAxisAlignedBounds(
	bounds VehicleModelTemplateParsedAxisAlignedBounds,
	requirePositiveDimensions bool,
	fieldName string,
) error {
	if !vehicleModelTemplateAllCoordinatesAreFinite(bounds.MinMm) ||
		!vehicleModelTemplateAllCoordinatesAreFinite(bounds.MaxMm) ||
		!vehicleModelTemplateGeometryNumberIsFinite(bounds.LengthMm) ||
		!vehicleModelTemplateGeometryNumberIsFinite(bounds.WidthMm) ||
		!vehicleModelTemplateGeometryNumberIsFinite(bounds.HeightMm) {
		return fmt.Errorf("%w: %s must be finite", ErrVehicleModelTemplateParsedGeometryInvalid, fieldName)
	}
	for index := range bounds.MinMm {
		if bounds.MinMm[index] > bounds.MaxMm[index] {
			return fmt.Errorf("%w: %s minMm must not exceed maxMm", ErrVehicleModelTemplateParsedGeometryInvalid, fieldName)
		}
	}
	if bounds.LengthMm < 0 || bounds.WidthMm < 0 || bounds.HeightMm < 0 {
		return fmt.Errorf("%w: %s dimensions must not be negative", ErrVehicleModelTemplateParsedGeometryInvalid, fieldName)
	}
	if requirePositiveDimensions &&
		(bounds.LengthMm <= 0 || bounds.WidthMm <= 0 || bounds.HeightMm <= 0) {
		return fmt.Errorf("%w: %s dimensions must be positive", ErrVehicleModelTemplateParsedGeometryInvalid, fieldName)
	}
	return nil
}

func vehicleModelTemplateFootprintFromParsedGeometryBounds(
	bounds VehicleModelTemplateParsedAxisAlignedBounds,
) (VehicleModelTemplateFootprint, error) {
	lengthMm, err := vehicleModelTemplateParsedPositiveMillimetresToInteger(bounds.LengthMm, "lengthMm")
	if err != nil {
		return VehicleModelTemplateFootprint{}, err
	}
	widthMm, err := vehicleModelTemplateParsedPositiveMillimetresToInteger(bounds.WidthMm, "widthMm")
	if err != nil {
		return VehicleModelTemplateFootprint{}, err
	}
	heightMm, err := vehicleModelTemplateParsedPositiveMillimetresToInteger(bounds.HeightMm, "heightMm")
	if err != nil {
		return VehicleModelTemplateFootprint{}, err
	}
	return VehicleModelTemplateFootprint{
		LengthMm: lengthMm,
		WidthMm:  widthMm,
		HeightMm: heightMm,
	}, nil
}

func vehicleModelTemplateParsedPositiveMillimetresToInteger(value float64, fieldName string) (int, error) {
	if !vehicleModelTemplateGeometryNumberIsFinite(value) || value <= 0 || value > float64(math.MaxInt32) {
		return 0, fmt.Errorf(
			"%w: %s must be a positive finite millimetre value",
			ErrVehicleModelTemplateParsedGeometryInvalid,
			fieldName,
		)
	}
	return int(math.Ceil(value)), nil
}

func vehicleModelTemplateGeometryNumberIsFinite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

func vehicleModelTemplateAllCoordinatesAreFinite(values [3]float64) bool {
	for _, value := range values {
		if !vehicleModelTemplateGeometryNumberIsFinite(value) {
			return false
		}
	}
	return true
}
