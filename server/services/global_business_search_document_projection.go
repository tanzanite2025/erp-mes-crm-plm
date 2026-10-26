package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func normalizeGlobalBusinessSearchRelationLookupKey(relation globalBusinessSearchRelation, key string) string {
	if !relation.foreignKeyIsUUID {
		return key
	}
	identifier, err := uuid.Parse(strings.TrimSpace(key))
	if err != nil {
		// Varchar references can contain legacy identifiers. Keep the main record
		// searchable without sending invalid values to a PostgreSQL UUID column.
		return ""
	}
	return identifier.String()
}

// Snapshot indexing and live result hydration share the same source projection.
func buildGlobalBusinessSearchTextExpression(alias string, columns []string) string {
	parts := make([]string, 0, len(columns))
	for _, column := range columns {
		parts = append(parts, "COALESCE(CAST("+alias+"."+column+" AS TEXT), '')")
	}
	return strings.Join(parts, " || ' ' || ")
}

func loadGlobalBusinessSearchSourceDocuments(searchContext context.Context, database *gorm.DB, source globalBusinessSearchSource, afterID string, recordIDs []string, limit int) ([]SearchDocument, error) {
	columns := []string{"CAST(record.id AS TEXT)", "COALESCE(CAST(record." + source.codeColumn + " AS TEXT), '')"}
	titles := make([]string, 0, len(source.titleColumns)+1)
	for _, column := range source.titleColumns {
		titles = append(titles, "NULLIF(TRIM(record."+column+"), '')")
	}
	columns = append(columns, "COALESCE("+strings.Join(titles, ", ")+", CAST(record.id AS TEXT))", buildGlobalBusinessSearchTextExpression("record", source.searchColumns))
	for _, relation := range source.relations {
		columns = append(columns, "COALESCE(CAST(record."+relation.parentKey+" AS TEXT), '')")
	}
	for _, scopeColumn := range source.userScopeColumns {
		columns = append(columns, "COALESCE(CAST(record."+scopeColumn+" AS TEXT), '')")
	}
	statement := "SELECT " + strings.Join(columns, ", ") + " FROM " + source.table + " AS record WHERE record.deleted_at IS NULL"
	arguments := []any{}
	if source.condition != "" {
		statement += " AND (" + source.condition + ")"
	}
	if afterID != "" {
		statement += " AND record.id > ?"
		arguments = append(arguments, afterID)
	}
	if recordIDs != nil {
		if len(recordIDs) == 0 {
			return []SearchDocument{}, nil
		}
		statement += " AND record.id IN ?"
		arguments = append(arguments, recordIDs)
	}
	statement += " ORDER BY record.id LIMIT ?"
	arguments = append(arguments, limit)
	rows, err := database.WithContext(searchContext).Raw(statement, arguments...).Rows()
	if err != nil {
		return nil, fmt.Errorf("read search source %s: %w", source.category, err)
	}
	documents := make([]SearchDocument, 0)
	relationParents := make([]map[string][]int, len(source.relations))
	for index := range relationParents {
		relationParents[index] = map[string][]int{}
	}
	for rows.Next() {
		values := make([]string, len(columns))
		destinations := make([]any, len(columns))
		for index := range values {
			destinations[index] = &values[index]
		}
		if err := rows.Scan(destinations...); err != nil {
			rows.Close()
			return nil, err
		}
		document := SearchDocument{ID: values[0], Code: values[1], Name: values[2], Model: values[3], Category: source.category, AllowedUserIDs: []string{}}
		for index, relation := range source.relations {
			key := normalizeGlobalBusinessSearchRelationLookupKey(relation, values[4+index])
			if key != "" {
				relationParents[index][key] = append(relationParents[index][key], len(documents))
			}
		}
		for index := range source.userScopeColumns {
			if userID := values[4+len(source.relations)+index]; userID != "" {
				document.AllowedUserIDs = append(document.AllowedUserIDs, userID)
			}
		}
		document.RestrictedToUsers = len(source.userScopeColumns) > 0
		documents = append(documents, document)
	}
	readError := rows.Err()
	rows.Close() // Release the connection before reading related records.
	if readError != nil {
		return nil, readError
	}
	for index, relation := range source.relations {
		keys := make([]string, 0, len(relationParents[index]))
		for key := range relationParents[index] {
			keys = append(keys, key)
		}
		if len(keys) == 0 {
			continue
		}
		statement := "SELECT CAST(related." + relation.foreignKey + " AS TEXT), " + buildGlobalBusinessSearchTextExpression("related", relation.searchColumns) + " FROM " + relation.table + " AS related WHERE related." + relation.foreignKey + " IN ?"
		if relation.softDeleted {
			statement += " AND related.deleted_at IS NULL"
		}
		// Stable relation order makes identical projections produce the same snapshot fingerprint.
		statement += " ORDER BY related." + relation.foreignKey + ", " + buildGlobalBusinessSearchTextExpression("related", relation.searchColumns)
		relatedRows, err := database.WithContext(searchContext).Raw(statement, keys).Rows()
		if err != nil {
			return nil, fmt.Errorf("read search relation %s: %w", relation.table, err)
		}
		for relatedRows.Next() {
			var key, text string
			if err := relatedRows.Scan(&key, &text); err != nil {
				relatedRows.Close()
				return nil, err
			}
			for _, documentIndex := range relationParents[index][key] {
				documents[documentIndex].Model += " " + text
			}
		}
		readError := relatedRows.Err()
		relatedRows.Close()
		if readError != nil {
			return nil, readError
		}
	}
	return documents, nil
}
