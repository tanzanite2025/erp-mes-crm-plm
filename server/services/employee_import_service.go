package services

import (
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

const employeeImportPreviewTTL = 30 * time.Minute

var (
	ErrEmployeeImportUnsupportedFileType = errors.New("employee import only supports .xlsx workbooks")
	ErrEmployeeImportEmptyWorkbook       = errors.New("employee import workbook is empty")
	ErrEmployeeImportInvalidSheetName    = errors.New("employee import worksheet name is invalid")
	ErrEmployeeImportStructureInvalid    = errors.New("employee import workbook structure is invalid")
	ErrEmployeeImportValidationFailed    = errors.New("employee import validation failed")
	ErrEmployeeImportPreviewNotFound     = errors.New("employee import preview token is invalid or expired")
	ErrEmployeeImportNothingToCommit     = errors.New("employee import has no rows to commit for the selected mode")
)

type EmployeeImportMode string

const (
	EmployeeImportModeAddOnly EmployeeImportMode = "add-only"
	EmployeeImportModeSync    EmployeeImportMode = "sync"
)

type EmployeeImportPreviewItem struct {
	RowNumber    int    `json:"rowNumber,omitempty"`
	StaffID      string `json:"staffId"`
	Name         string `json:"name"`
	DeptID       string `json:"deptId,omitempty"`
	DeptName     string `json:"deptName,omitempty"`
	PositionID   string `json:"positionId,omitempty"`
	PositionName string `json:"positionName,omitempty"`
	Phone        string `json:"phone,omitempty"`
	Gender       string `json:"gender,omitempty"`
	Status       string `json:"status,omitempty"`
	Action       string `json:"action,omitempty"`
}

type EmployeeImportPreviewResponse struct {
	PreviewToken      string                      `json:"previewToken"`
	FileName          string                      `json:"fileName"`
	SheetName         string                      `json:"sheetName"`
	ImportedCount     int                         `json:"importedCount"`
	CreateCount       int                         `json:"createCount"`
	UpdateCount       int                         `json:"updateCount"`
	MissingCount      int                         `json:"missingCount"`
	NewEmployees      []EmployeeImportPreviewItem `json:"newEmployees"`
	ExistingEmployees []EmployeeImportPreviewItem `json:"existingEmployees"`
	MissingEmployees  []EmployeeImportPreviewItem `json:"missingEmployees"`
	PreviewRows       []EmployeeImportPreviewItem `json:"previewRows"`
}

type CommitEmployeeImportRequest struct {
	PreviewToken string             `json:"previewToken"`
	Mode         EmployeeImportMode `json:"mode"`
}

type CommitEmployeeImportResponse struct {
	Status  string `json:"status"`
	Count   int    `json:"count"`
	Created int    `json:"created"`
	Updated int    `json:"updated"`
	Skipped int    `json:"skipped"`
}

type employeeImportSnapshot struct {
	fileName  string
	sheetName string
	imported  []employeeImportResolvedRow
	newRows   []employeeImportResolvedRow
	missing   []models.Employee
	createdAt time.Time
}

type employeeImportResolvedRow struct {
	rowNumber         int
	employee          models.Employee
	deptDisplayName   string
	positionSpecified bool
	action            string
}

type employeeImportDraftRow struct {
	staffID           string
	name              string
	deptName          string
	positionName      string
	positionSpecified bool
	phone             string
	emergencyPhone    string
	gender            string
	joinedDate        *time.Time
	status            string
	age               int
	idCard            string
	birthday          *time.Time
	address           string
	bankCard          string
	bankName          string
	education         string
}

var employeeImportPreviewStore = struct {
	mu    sync.Mutex
	items map[string]employeeImportSnapshot
}{
	items: map[string]employeeImportSnapshot{},
}

var employeeImportAllowedSheetNames = map[string]struct{}{
	normalizeEmployeeImportHeader("人员档案导入模板"):                  {},
	normalizeEmployeeImportHeader("人员档案导出"):                    {},
	normalizeEmployeeImportHeader("Personnel Import Template"): {},
	normalizeEmployeeImportHeader("Personnel Export"):          {},
}

var employeeImportHeaderCandidates = []struct {
	key      string
	required bool
	headers  []string
}{
	{key: "serialNo", headers: []string{"序号", "No."}},
	{key: "staffId", required: true, headers: []string{"工号", "Staff ID"}},
	{key: "name", required: true, headers: []string{"姓名", "Name"}},
	{key: "deptId", required: true, headers: []string{"部门", "Department"}},
	{key: "position", headers: []string{"岗位", "Position"}},
	{key: "phone", headers: []string{"电话", "Phone"}},
	{key: "emergencyPhone", headers: []string{"紧急联系人电话", "Emergency Contact Phone"}},
	{key: "gender", headers: []string{"性别", "Gender"}},
	{key: "joinedDate", headers: []string{"入职日期", "Join Date"}},
	{key: "workYears", headers: []string{"在司工龄/年", "Years of Service"}},
	{key: "status", headers: []string{"在职情况", "Employment Status"}},
	{key: "age", headers: []string{"年龄", "Age"}},
	{key: "idCard", headers: []string{"身份证号码", "ID Card No."}},
	{key: "birthday", headers: []string{"生日", "Birthday"}},
	{key: "address", headers: []string{"家庭住址", "Home Address"}},
	{key: "bankCard", headers: []string{"银行卡", "Bank Card"}},
	{key: "bankName", headers: []string{"开户行", "Bank Name"}},
	{key: "education", headers: []string{"学历", "Education"}},
}

func PreviewEmployeeImport(fileName string, reader io.Reader) (EmployeeImportPreviewResponse, error) {
	return defaultOrganizationService.PreviewEmployeeImport(fileName, reader)
}

func CommitEmployeeImport(input CommitEmployeeImportRequest) (CommitEmployeeImportResponse, error) {
	return defaultOrganizationService.CommitEmployeeImport(input)
}

func (s *OrganizationService) PreviewEmployeeImport(fileName string, reader io.Reader) (EmployeeImportPreviewResponse, error) {
	workbook, err := excelize.OpenReader(reader)
	if err != nil {
		if strings.EqualFold(filepath.Ext(fileName), ".xls") {
			return EmployeeImportPreviewResponse{}, fmt.Errorf("%w: please save the workbook as .xlsx before importing", ErrEmployeeImportUnsupportedFileType)
		}
		return EmployeeImportPreviewResponse{}, fmt.Errorf("%w: %v", ErrEmployeeImportUnsupportedFileType, err)
	}
	defer func() { _ = workbook.Close() }()

	sheets := workbook.GetSheetList()
	if len(sheets) == 0 {
		return EmployeeImportPreviewResponse{}, ErrEmployeeImportEmptyWorkbook
	}

	sheetName := sheets[0]
	if _, ok := employeeImportAllowedSheetNames[normalizeEmployeeImportHeader(sheetName)]; !ok {
		return EmployeeImportPreviewResponse{}, fmt.Errorf("%w: %s", ErrEmployeeImportInvalidSheetName, sheetName)
	}

	rows, err := workbook.GetRows(sheetName)
	if err != nil {
		return EmployeeImportPreviewResponse{}, fmt.Errorf("%w: failed to read worksheet rows", ErrEmployeeImportValidationFailed)
	}
	if len(rows) < 2 {
		return EmployeeImportPreviewResponse{}, ErrEmployeeImportEmptyWorkbook
	}

	headerIndex, err := resolveEmployeeImportHeaders(rows[0])
	if err != nil {
		return EmployeeImportPreviewResponse{}, err
	}

	deptMap, ambiguousDeptNames, err := s.buildEmployeeImportDeptMap()
	if err != nil {
		return EmployeeImportPreviewResponse{}, err
	}
	positionMap, ambiguousPositionNames, err := s.buildEmployeeImportPositionMap()
	if err != nil {
		return EmployeeImportPreviewResponse{}, err
	}

	importedRows, err := parseEmployeeImportRows(rows[1:], headerIndex, deptMap, ambiguousDeptNames, positionMap, ambiguousPositionNames)
	if err != nil {
		return EmployeeImportPreviewResponse{}, err
	}

	existingEmployees, err := s.repository.ListEmployees(s.txManager.DB())
	if err != nil {
		return EmployeeImportPreviewResponse{}, err
	}

	diff := buildEmployeeImportDiff(importedRows, existingEmployees)
	token := storeEmployeeImportPreview(employeeImportSnapshot{
		fileName:  fileName,
		sheetName: sheetName,
		imported:  diff.importedRows,
		newRows:   diff.newRows,
		missing:   diff.missingEmployees,
		createdAt: time.Now(),
	})

	return EmployeeImportPreviewResponse{
		PreviewToken:      token,
		FileName:          fileName,
		SheetName:         sheetName,
		ImportedCount:     len(diff.importedRows),
		CreateCount:       len(diff.newRows),
		UpdateCount:       len(diff.existingRows),
		MissingCount:      len(diff.missingEmployees),
		NewEmployees:      buildEmployeeImportPreviewItems(diff.newRows),
		ExistingEmployees: buildEmployeeImportPreviewItems(diff.existingRows),
		MissingEmployees:  buildEmployeeImportMissingItems(diff.missingEmployees),
		PreviewRows:       buildEmployeeImportPreviewItems(limitEmployeeImportRows(diff.importedRows, 5)),
	}, nil
}

func (s *OrganizationService) CommitEmployeeImport(input CommitEmployeeImportRequest) (CommitEmployeeImportResponse, error) {
	mode := input.Mode
	if mode != EmployeeImportModeAddOnly && mode != EmployeeImportModeSync {
		mode = EmployeeImportModeAddOnly
	}

	snapshot, ok := getEmployeeImportPreview(input.PreviewToken)
	if !ok {
		return CommitEmployeeImportResponse{}, ErrEmployeeImportPreviewNotFound
	}

	targetRows := snapshot.imported
	skipped := 0
	if mode == EmployeeImportModeAddOnly {
		targetRows = snapshot.newRows
		skipped = len(snapshot.imported) - len(snapshot.newRows)
	}

	if len(targetRows) == 0 {
		return CommitEmployeeImportResponse{}, ErrEmployeeImportNothingToCommit
	}

	result := CommitEmployeeImportResponse{
		Status:  "success",
		Count:   len(targetRows),
		Skipped: skipped,
	}

	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		for _, row := range targetRows {
			existing, found, err := s.repository.FindEmployeeByIDOrStaffID(tx, row.employee.ID, row.employee.StaffID)
			if err != nil {
				return err
			}

			employeeToSave := row.employee
			action := "Create"
			if found {
				employeeToSave = mergeImportedEmployee(existing, row.employee)
				action = "Update"
				result.Updated++
			} else {
				if strings.TrimSpace(employeeToSave.ID) == "" {
					employeeToSave.ID = uuid.NewString()
				}
				result.Created++
			}

			if err := s.repository.SaveEmployee(tx, &employeeToSave); err != nil {
				return err
			}
			if _, err := syncPrimaryAssignmentProjectionFromEmployee(tx, employeeToSave, "employee_import_commit", ""); err != nil {
				return err
			}
			if row.positionSpecified {
				var nextPositionID *string
				if strings.TrimSpace(row.employee.PositionID) != "" {
					nextPositionID = stringPointer(row.employee.PositionID)
				}
				if _, err := applyPrimaryAssignmentPosition(tx, employeeToSave, nextPositionID, "employee_import_commit", ""); err != nil {
					return err
				}
			}
			if err := recordAuditEventTx(tx, audit.NewAuditEvent(
				audit.AuditEntityEmployee,
				employeeToSave.ID,
				audit.AuditAction(action),
				audit.AuditActor{},
			).Normalize()); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return CommitEmployeeImportResponse{}, err
	}

	deleteEmployeeImportPreview(input.PreviewToken)
	return result, nil
}

type employeeImportDiff struct {
	importedRows     []employeeImportResolvedRow
	newRows          []employeeImportResolvedRow
	existingRows     []employeeImportResolvedRow
	missingEmployees []models.Employee
}

func buildEmployeeImportDiff(importedRows []employeeImportResolvedRow, existingEmployees []models.Employee) employeeImportDiff {
	currentByStaffID := make(map[string]models.Employee, len(existingEmployees))
	importedStaffIDs := make(map[string]struct{}, len(importedRows))
	diff := employeeImportDiff{
		importedRows: importedRows,
	}

	for _, employee := range existingEmployees {
		staffID := strings.TrimSpace(employee.StaffID)
		if staffID == "" {
			continue
		}
		if _, exists := currentByStaffID[staffID]; exists {
			continue
		}
		currentByStaffID[staffID] = employee
	}

	for _, row := range importedRows {
		staffID := strings.TrimSpace(row.employee.StaffID)
		importedStaffIDs[staffID] = struct{}{}
		if existing, found := currentByStaffID[staffID]; found {
			row.action = "update"
			row.employee.ID = existing.ID
			diff.existingRows = append(diff.existingRows, row)
			continue
		}

		row.action = "create"
		diff.newRows = append(diff.newRows, row)
	}

	for _, employee := range existingEmployees {
		staffID := strings.TrimSpace(employee.StaffID)
		if staffID == "" {
			continue
		}
		if _, found := importedStaffIDs[staffID]; found {
			continue
		}
		diff.missingEmployees = append(diff.missingEmployees, employee)
	}

	return diff
}

func buildEmployeeImportPreviewItems(rows []employeeImportResolvedRow) []EmployeeImportPreviewItem {
	items := make([]EmployeeImportPreviewItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, EmployeeImportPreviewItem{
			RowNumber:    row.rowNumber,
			StaffID:      row.employee.StaffID,
			Name:         row.employee.Name,
			DeptID:       row.employee.DeptID,
			DeptName:     row.deptDisplayName,
			PositionID:   row.employee.PositionID,
			PositionName: row.employee.PositionName,
			Phone:        row.employee.Phone,
			Gender:       row.employee.Gender,
			Status:       row.employee.Status,
			Action:       row.action,
		})
	}
	return items
}

func buildEmployeeImportMissingItems(employees []models.Employee) []EmployeeImportPreviewItem {
	items := make([]EmployeeImportPreviewItem, 0, len(employees))
	for _, employee := range employees {
		items = append(items, EmployeeImportPreviewItem{
			StaffID:      employee.StaffID,
			Name:         employee.Name,
			DeptID:       employee.DeptID,
			DeptName:     employee.DeptName,
			PositionID:   employee.PositionID,
			PositionName: employee.PositionName,
			Phone:        employee.Phone,
			Gender:       employee.Gender,
			Status:       employee.Status,
			Action:       "missing",
		})
	}
	return items
}

func limitEmployeeImportRows(rows []employeeImportResolvedRow, limit int) []employeeImportResolvedRow {
	if len(rows) <= limit {
		return rows
	}
	return rows[:limit]
}

func resolveEmployeeImportHeaders(headerRow []string) (map[string]int, error) {
	actualHeaderMap := make(map[string]int, len(headerRow))
	for index, header := range headerRow {
		actualHeaderMap[normalizeEmployeeImportHeader(header)] = index
	}

	resolved := make(map[string]int, len(employeeImportHeaderCandidates))
	missing := make([]string, 0)
	expectedNormalized := make(map[string]struct{})

	for _, column := range employeeImportHeaderCandidates {
		foundIndex := -1
		for _, header := range column.headers {
			normalized := normalizeEmployeeImportHeader(header)
			expectedNormalized[normalized] = struct{}{}
			if index, ok := actualHeaderMap[normalized]; ok {
				foundIndex = index
				break
			}
		}
		if column.required && foundIndex == -1 {
			missing = append(missing, column.headers[0])
			continue
		}
		if foundIndex >= 0 {
			resolved[column.key] = foundIndex
		}
	}

	unexpected := make([]string, 0)
	for _, header := range headerRow {
		normalized := normalizeEmployeeImportHeader(header)
		if normalized == "" {
			continue
		}
		if _, ok := expectedNormalized[normalized]; !ok {
			unexpected = append(unexpected, header)
		}
	}

	if len(missing) > 0 || len(unexpected) > 0 {
		problems := make([]string, 0, len(missing)+len(unexpected))
		if len(missing) > 0 {
			problems = append(problems, "missing columns: "+strings.Join(missing, ", "))
		}
		if len(unexpected) > 0 {
			problems = append(problems, "unexpected columns: "+strings.Join(unexpected, ", "))
		}
		return nil, fmt.Errorf("%w: %s", ErrEmployeeImportStructureInvalid, strings.Join(problems, "; "))
	}

	return resolved, nil
}

func parseEmployeeImportRows(
	rows [][]string,
	headerIndex map[string]int,
	deptMap map[string]string,
	ambiguousDeptNames map[string]struct{},
	positionMap map[string]string,
	ambiguousPositionNames map[string]struct{},
) ([]employeeImportResolvedRow, error) {
	seenStaffIDs := map[string]int{}
	errorsFound := make([]string, 0)
	resolvedRows := make([]employeeImportResolvedRow, 0, len(rows))

	for rowIndex, row := range rows {
		lineNumber := rowIndex + 2
		if isEmployeeImportRowEmpty(row) {
			continue
		}

		draft := employeeImportDraftRow{
			staffID:        strings.TrimSpace(getEmployeeImportCell(row, headerIndex, "staffId")),
			name:           strings.TrimSpace(getEmployeeImportCell(row, headerIndex, "name")),
			deptName:       strings.TrimSpace(getEmployeeImportCell(row, headerIndex, "deptId")),
			phone:          strings.TrimSpace(getEmployeeImportCell(row, headerIndex, "phone")),
			emergencyPhone: strings.TrimSpace(getEmployeeImportCell(row, headerIndex, "emergencyPhone")),
			gender:         normalizeEmployeeImportGender(getEmployeeImportCell(row, headerIndex, "gender")),
			status:         normalizeEmployeeImportStatus(getEmployeeImportCell(row, headerIndex, "status")),
			idCard:         strings.TrimSpace(getEmployeeImportCell(row, headerIndex, "idCard")),
			address:        strings.TrimSpace(getEmployeeImportCell(row, headerIndex, "address")),
			bankCard:       strings.TrimSpace(getEmployeeImportCell(row, headerIndex, "bankCard")),
			bankName:       strings.TrimSpace(getEmployeeImportCell(row, headerIndex, "bankName")),
			education:      normalizeEmployeeImportEducation(getEmployeeImportCell(row, headerIndex, "education")),
		}
		if positionValue, ok := getEmployeeImportCellWithPresence(row, headerIndex, "position"); ok {
			draft.positionSpecified = true
			draft.positionName = strings.TrimSpace(positionValue)
		}

		if draft.staffID == "" {
			errorsFound = append(errorsFound, fmt.Sprintf("row %d: staff ID is required", lineNumber))
			continue
		}
		if firstLine, duplicated := seenStaffIDs[draft.staffID]; duplicated {
			errorsFound = append(errorsFound, fmt.Sprintf("row %d: staff ID [%s] duplicates row %d", lineNumber, draft.staffID, firstLine))
			continue
		}
		seenStaffIDs[draft.staffID] = lineNumber

		if draft.name == "" {
			errorsFound = append(errorsFound, fmt.Sprintf("row %d: name is required", lineNumber))
			continue
		}
		if draft.deptName == "" {
			errorsFound = append(errorsFound, fmt.Sprintf("row %d: department is required", lineNumber))
			continue
		}
		if _, duplicated := ambiguousDeptNames[draft.deptName]; duplicated {
			errorsFound = append(errorsFound, fmt.Sprintf("row %d: department [%s] is ambiguous among level-2 departments", lineNumber, draft.deptName))
			continue
		}
		deptID, matched := deptMap[draft.deptName]
		if !matched {
			errorsFound = append(errorsFound, fmt.Sprintf("row %d: department [%s] could not be matched to a level-2 department", lineNumber, draft.deptName))
			continue
		}
		resolvedPositionID := ""
		if draft.positionSpecified && draft.positionName != "" {
			normalizedPosition := normalizeEmployeeImportLookup(draft.positionName)
			if _, duplicated := ambiguousPositionNames[normalizedPosition]; duplicated {
				errorsFound = append(errorsFound, fmt.Sprintf("row %d: position [%s] is ambiguous", lineNumber, draft.positionName))
				continue
			}
			positionID, matched := positionMap[normalizedPosition]
			if !matched {
				errorsFound = append(errorsFound, fmt.Sprintf("row %d: position [%s] could not be matched", lineNumber, draft.positionName))
				continue
			}
			resolvedPositionID = positionID
		}

		if ageValue := strings.TrimSpace(getEmployeeImportCell(row, headerIndex, "age")); ageValue != "" {
			parsedAge, err := strconv.Atoi(ageValue)
			if err != nil {
				errorsFound = append(errorsFound, fmt.Sprintf("row %d: age [%s] is invalid", lineNumber, ageValue))
				continue
			}
			draft.age = parsedAge
		}

		if joinedDate, err := parseEmployeeImportDate(getEmployeeImportCell(row, headerIndex, "joinedDate")); err != nil {
			errorsFound = append(errorsFound, fmt.Sprintf("row %d: join date is invalid", lineNumber))
			continue
		} else {
			draft.joinedDate = joinedDate
		}

		if birthday, err := parseEmployeeImportDate(getEmployeeImportCell(row, headerIndex, "birthday")); err != nil {
			errorsFound = append(errorsFound, fmt.Sprintf("row %d: birthday is invalid", lineNumber))
			continue
		} else {
			draft.birthday = birthday
		}

		resolvedRows = append(resolvedRows, employeeImportResolvedRow{
			rowNumber: lineNumber,
			employee: models.Employee{
				StaffID:        draft.staffID,
				Name:           draft.name,
				DeptID:         deptID,
				Phone:          draft.phone,
				EmergencyPhone: draft.emergencyPhone,
				Gender:         draft.gender,
				JoinedDate:     draft.joinedDate,
				Status:         draft.status,
				Age:            draft.age,
				IDCard:         draft.idCard,
				Birthday:       draft.birthday,
				Address:        draft.address,
				BankCard:       draft.bankCard,
				BankName:       draft.bankName,
				Education:      draft.education,
				PositionID:     resolvedPositionID,
				PositionName:   draft.positionName,
			},
			deptDisplayName:   draft.deptName,
			positionSpecified: draft.positionSpecified,
		})
	}

	if len(errorsFound) > 0 {
		preview := errorsFound
		if len(preview) > 5 {
			preview = preview[:5]
		}
		return nil, fmt.Errorf("%w: %s", ErrEmployeeImportValidationFailed, strings.Join(preview, "; "))
	}

	if len(resolvedRows) == 0 {
		return nil, ErrEmployeeImportEmptyWorkbook
	}

	return resolvedRows, nil
}

func (s *OrganizationService) buildEmployeeImportDeptMap() (map[string]string, map[string]struct{}, error) {
	nodes, err := s.repository.ListOrganizations(s.txManager.DB())
	if err != nil {
		return nil, nil, err
	}

	deptMap := make(map[string]string)
	ambiguous := make(map[string]struct{})
	for _, node := range nodes {
		if strings.TrimSpace(node.Type) != "department" {
			continue
		}
		name := strings.TrimSpace(node.Name)
		if name == "" {
			continue
		}
		if _, exists := deptMap[name]; exists {
			ambiguous[name] = struct{}{}
			continue
		}
		deptMap[name] = node.ID
	}

	for name := range ambiguous {
		delete(deptMap, name)
	}

	return deptMap, ambiguous, nil
}

func (s *OrganizationService) buildEmployeeImportPositionMap() (map[string]string, map[string]struct{}, error) {
	positions, err := s.repository.ListPositions(s.txManager.DB())
	if err != nil {
		return nil, nil, err
	}

	positionMap := make(map[string]string)
	ambiguous := make(map[string]struct{})
	for _, position := range positions {
		positionID := strings.TrimSpace(position.ID)
		if positionID == "" {
			continue
		}

		registerEmployeeImportPositionLookup(positionMap, ambiguous, positionID, positionID, false)
		registerEmployeeImportPositionLookup(positionMap, ambiguous, position.Code, positionID, false)
		registerEmployeeImportPositionLookup(positionMap, ambiguous, position.Name, positionID, true)
	}

	return positionMap, ambiguous, nil
}

func registerEmployeeImportPositionLookup(
	lookup map[string]string,
	ambiguous map[string]struct{},
	rawKey string,
	positionID string,
	allowAmbiguous bool,
) {
	normalizedKey := normalizeEmployeeImportLookup(rawKey)
	normalizedPositionID := strings.TrimSpace(positionID)
	if normalizedKey == "" || normalizedPositionID == "" {
		return
	}

	if existing, exists := lookup[normalizedKey]; exists && existing != normalizedPositionID {
		if allowAmbiguous {
			ambiguous[normalizedKey] = struct{}{}
			delete(lookup, normalizedKey)
		}
		return
	}
	if _, exists := ambiguous[normalizedKey]; exists {
		return
	}

	lookup[normalizedKey] = normalizedPositionID
}

func mergeImportedEmployee(existing models.Employee, imported models.Employee) models.Employee {
	existing.StaffID = imported.StaffID
	existing.Name = imported.Name
	existing.Gender = imported.Gender
	existing.Birthday = imported.Birthday
	existing.IDCard = imported.IDCard
	existing.Phone = imported.Phone
	existing.EmergencyPhone = imported.EmergencyPhone
	existing.Address = imported.Address
	existing.BankCard = imported.BankCard
	existing.BankName = imported.BankName
	existing.Education = imported.Education
	existing.Age = imported.Age
	existing.Status = imported.Status
	existing.JoinedDate = imported.JoinedDate
	existing.DeptID = imported.DeptID
	return existing
}

func storeEmployeeImportPreview(snapshot employeeImportSnapshot) string {
	cleanupExpiredEmployeeImportPreviews()

	token := uuid.NewString()
	employeeImportPreviewStore.mu.Lock()
	employeeImportPreviewStore.items[token] = snapshot
	employeeImportPreviewStore.mu.Unlock()
	return token
}

func getEmployeeImportPreview(token string) (employeeImportSnapshot, bool) {
	cleanupExpiredEmployeeImportPreviews()

	employeeImportPreviewStore.mu.Lock()
	defer employeeImportPreviewStore.mu.Unlock()

	snapshot, ok := employeeImportPreviewStore.items[token]
	if !ok {
		return employeeImportSnapshot{}, false
	}
	return snapshot, true
}

func deleteEmployeeImportPreview(token string) {
	employeeImportPreviewStore.mu.Lock()
	delete(employeeImportPreviewStore.items, token)
	employeeImportPreviewStore.mu.Unlock()
}

func cleanupExpiredEmployeeImportPreviews() {
	employeeImportPreviewStore.mu.Lock()
	defer employeeImportPreviewStore.mu.Unlock()

	now := time.Now()
	for token, snapshot := range employeeImportPreviewStore.items {
		if snapshot.createdAt.Add(employeeImportPreviewTTL).Before(now) {
			delete(employeeImportPreviewStore.items, token)
		}
	}
}

func isEmployeeImportRowEmpty(row []string) bool {
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}

func getEmployeeImportCell(row []string, headerIndex map[string]int, key string) string {
	index, ok := headerIndex[key]
	if !ok || index < 0 || index >= len(row) {
		return ""
	}
	return row[index]
}

func getEmployeeImportCellWithPresence(row []string, headerIndex map[string]int, key string) (string, bool) {
	index, ok := headerIndex[key]
	if !ok || index < 0 || index >= len(row) {
		return "", false
	}
	return row[index], true
}

func normalizeEmployeeImportHeader(value string) string {
	return strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(value), " ", ""), "\n", ""), "\r", ""))
}

func normalizeEmployeeImportLookup(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func parseEmployeeImportDate(value string) (*time.Time, error) {
	raw := strings.TrimSpace(value)
	if raw == "" {
		return nil, nil
	}

	layouts := []string{
		time.RFC3339,
		"2006-01-02",
		"2006/01/02",
		"2006.01.02",
		"01/02/2006",
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, raw); err == nil {
			return &parsed, nil
		}
	}

	if serial, err := strconv.ParseFloat(raw, 64); err == nil {
		if parsed, err := excelize.ExcelDateToTime(serial, false); err == nil {
			return &parsed, nil
		}
	}

	return nil, ErrEmployeeImportValidationFailed
}

func normalizeEmployeeImportStatus(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	switch normalized {
	case "", "在职", "active":
		return "active"
	case "离职", "resigned":
		return "resigned"
	case "请假", "on leave", "on-leave":
		return "on-leave"
	default:
		return "active"
	}
}

func normalizeEmployeeImportGender(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	switch normalized {
	case "男", "male", "m":
		return "男"
	case "女", "female", "f":
		return "女"
	default:
		return strings.TrimSpace(value)
	}
}

func normalizeEmployeeImportEducation(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	switch normalized {
	case "":
		return ""
	case "初中", "junior high":
		return "初中"
	case "高中", "high school":
		return "高中"
	case "中专", "vocational":
		return "中专"
	case "大专", "junior college":
		return "大专"
	case "本科", "bachelor":
		return "本科"
	case "硕士", "master":
		return "硕士"
	case "博士", "doctor":
		return "博士"
	default:
		return strings.TrimSpace(value)
	}
}
