use super::*;

fn create_business_search_test_document(
    id: &str,
    category: &str,
    code: &str,
    text: &str,
) -> BusinessRecordSearchDocument {
    BusinessRecordSearchDocument {
        id: id.to_owned(),
        category: category.to_owned(),
        code: code.to_owned(),
        name: code.to_owned(),
        model: text.to_owned(),
        restricted_to_users: false,
        allowed_user_ids: vec![],
    }
}

fn create_business_search_test_request(
    keyword: &str,
    categories: &[&str],
) -> BusinessRecordSearchRequest {
    BusinessRecordSearchRequest {
        q: keyword.to_owned(),
        categories: categories.iter().map(|value| (*value).to_owned()).collect(),
        user_id: "user-a".to_owned(),
        can_manage: false,
        limit: 100,
        offset: 0,
        generation: String::new(),
    }
}

fn create_published_business_search_test_snapshot(
    documents: Vec<BusinessRecordSearchDocument>,
) -> BusinessRecordSearchSnapshot {
    let mut snapshot =
        BusinessRecordSearchSnapshot::create_empty_business_record_search_snapshot().unwrap();
    snapshot
        .append_business_record_search_documents(documents)
        .unwrap();
    snapshot.writer.commit().unwrap();
    snapshot.reader.reload().unwrap();
    snapshot
}

#[test]
fn business_search_matches_literal_chinese_codes_and_normalized_multiple_keywords() {
    let snapshot = create_published_business_search_test_snapshot(vec![
        create_business_search_test_document(
            "1",
            "sales-order",
            "SO-A&B/77",
            "SO-A&B/77 更新客户名 客户料号-009 SKU-CARBON-77",
        ),
        create_business_search_test_document("2", "material", "A_100%&!", "A_100%&! 碳布"),
        create_business_search_test_document("3", "material", "AX100more", "AX100more"),
    ]);
    for keyword in ["客户料号-009 更新客户", "sku-carbon-77", "SO-A&B/77", "户"] {
        let result = snapshot
            .search_business_record_snapshot(&create_business_search_test_request(
                keyword,
                &["sales-order", "material"],
            ))
            .unwrap();
        assert_eq!(result.items.len(), 1, "{keyword}");
        assert_eq!(result.items[0].id, "1");
    }
    for keyword in ["A_100%&!", "１００％", "_100%", "布"] {
        let result = snapshot
            .search_business_record_snapshot(&create_business_search_test_request(
                keyword,
                &["material"],
            ))
            .unwrap();
        assert_eq!(result.items.len(), 1, "{keyword}");
        assert_eq!(result.items[0].id, "2");
    }
    for keyword in ["code:(", "*", "\"", "name:客户", "料号-009 不存在"] {
        let result = snapshot
            .search_business_record_snapshot(&create_business_search_test_request(
                keyword,
                &["sales-order", "material"],
            ))
            .unwrap();
        assert!(result.items.is_empty(), "{keyword}");
    }
}

#[test]
fn business_search_verifies_complete_substrings_and_ranks_exact_codes_before_pagination() {
    let snapshot = create_published_business_search_test_snapshot(vec![
        create_business_search_test_document("1", "material", "prefix-ABC-123", "prefix-ABC-123"),
        create_business_search_test_document("2", "material", "ABC-123-extra", "ABC-123-extra"),
        create_business_search_test_document("3", "material", "ABC-123", "ABC-123"),
        create_business_search_test_document(
            "4",
            "material",
            "gram-false-positive",
            "ABC BC- C-1 -12 123",
        ),
    ]);
    let mut request = create_business_search_test_request("abc-123", &["material"]);
    request.limit = 2;
    let result = snapshot.search_business_record_snapshot(&request).unwrap();
    assert_eq!(
        result
            .items
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>(),
        vec!["3", "2"]
    );
    assert!(result.has_more);
    request.offset = 2;
    let result = snapshot.search_business_record_snapshot(&request).unwrap();
    assert_eq!(result.items.len(), 1);
    assert_eq!(result.items[0].id, "1");
    assert!(!result.has_more);
}

#[test]
fn business_search_filters_categories_and_record_ownership_before_pagination() {
    let mut own = create_business_search_test_document("own", "approval-request", "共同", "共同");
    own.restricted_to_users = true;
    own.allowed_user_ids = vec!["user-a".to_owned()];
    let mut other = own.clone();
    other.id = "other".to_owned();
    other.allowed_user_ids = vec!["user-b".to_owned()];
    let snapshot = create_published_business_search_test_snapshot(vec![
        create_business_search_test_document("supplier", "supplier", "共同", "共同"),
        own,
        other,
    ]);
    let mut request = create_business_search_test_request("共同", &["approval-request"]);
    request.limit = 1;
    let result = snapshot.search_business_record_snapshot(&request).unwrap();
    assert_eq!(result.items.len(), 1);
    assert_eq!(result.items[0].id, "own");
    assert!(!result.has_more);
    request.can_manage = true;
    assert!(
        snapshot
            .search_business_record_snapshot(&request)
            .unwrap()
            .has_more
    );
    request.can_manage = false;
    request.user_id.clear();
    assert!(snapshot
        .search_business_record_snapshot(&request)
        .unwrap()
        .items
        .is_empty());
    request.categories.clear();
    assert!(snapshot
        .search_business_record_snapshot(&request)
        .unwrap()
        .items
        .is_empty());
}

#[tokio::test]
async fn business_search_rejects_batches_that_cross_the_candidate_window_before_reading_an_index() {
    let state = Arc::new(BusinessRecordSearchState::default());
    for (offset, limit, expected_status) in [
        (99999, 1, StatusCode::SERVICE_UNAVAILABLE),
        (99999, 2, StatusCode::BAD_REQUEST),
        (100000, 1, StatusCode::BAD_REQUEST),
        (usize::MAX, 100, StatusCode::BAD_REQUEST),
    ] {
        let mut request = create_business_search_test_request("物料", &["material"]);
        request.offset = offset;
        request.limit = limit;
        request.generation = "boundary-snapshot".to_owned();
        assert_eq!(
            search_business_record_index(State(state.clone()), Json(request))
                .await
                .unwrap_err()
                .0,
            expected_status,
            "offset={offset}, limit={limit}"
        );
    }
}

#[tokio::test]
async fn business_search_publishes_complete_snapshots_atomically_and_preserves_old_index_on_abort()
{
    let state = Arc::new(BusinessRecordSearchState::default());
    let request = create_business_search_test_request("记录", &["material"]);
    assert_eq!(
        search_business_record_index(State(state.clone()), Json(request.clone()))
            .await
            .unwrap_err()
            .0,
        StatusCode::SERVICE_UNAVAILABLE
    );
    let Json(start) = begin_business_record_search_snapshot(State(state.clone()))
        .await
        .unwrap();
    let token = start["token"].as_str().unwrap().to_owned();
    let _ = append_business_record_search_snapshot_batch(
        State(state.clone()),
        Path(token.clone()),
        Json(vec![create_business_search_test_document(
            "old",
            "material",
            "旧记录",
            "旧记录",
        )]),
    )
    .await
    .unwrap();
    assert!(state.active.read().unwrap().is_none());
    let _ = publish_business_record_search_snapshot(
        State(state.clone()),
        Path(token.clone()),
        Json(BusinessRecordSearchSnapshotPublication {
            generation: "old-generation".to_owned(),
        }),
    )
    .await
    .unwrap();
    let Json(response) = search_business_record_index(State(state.clone()), Json(request.clone()))
        .await
        .unwrap();
    assert_eq!(response.items[0].id, "old");
    let Json(next) = begin_business_record_search_snapshot(State(state.clone()))
        .await
        .unwrap();
    let next_token = next["token"].as_str().unwrap().to_owned();
    assert_eq!(
        begin_business_record_search_snapshot(State(state.clone()))
            .await
            .unwrap_err()
            .0,
        StatusCode::CONFLICT
    );
    let _ = append_business_record_search_snapshot_batch(
        State(state.clone()),
        Path(next_token.clone()),
        Json(vec![create_business_search_test_document(
            "new",
            "material",
            "新记录",
            "新记录",
        )]),
    )
    .await
    .unwrap();
    let _ = abort_business_record_search_snapshot(State(state.clone()), Path(next_token.clone()))
        .await
        .unwrap();
    assert_eq!(
        publish_business_record_search_snapshot(
            State(state.clone()),
            Path(next_token),
            Json(BusinessRecordSearchSnapshotPublication {
                generation: "aborted-generation".to_owned()
            })
        )
        .await
        .unwrap_err()
        .0,
        StatusCode::CONFLICT
    );
    let Json(response) = search_business_record_index(State(state.clone()), Json(request.clone()))
        .await
        .unwrap();
    assert_eq!(response.items[0].id, "old");
    let Json(final_start) = begin_business_record_search_snapshot(State(state.clone()))
        .await
        .unwrap();
    let final_token = final_start["token"].as_str().unwrap().to_owned();
    let _ = publish_business_record_search_snapshot(
        State(state.clone()),
        Path(final_token),
        Json(BusinessRecordSearchSnapshotPublication {
            generation: "new-generation".to_owned(),
        }),
    )
    .await
    .unwrap();
    let mut previous_generation_request = request.clone();
    previous_generation_request.generation = "old-generation".to_owned();
    assert_eq!(
        search_business_record_index(State(state.clone()), Json(previous_generation_request))
            .await
            .unwrap_err()
            .0,
        StatusCode::CONFLICT,
        "pagination must not silently cross a snapshot replacement"
    );
    let Json(response) = search_business_record_index(State(state.clone()), Json(request))
        .await
        .unwrap();
    assert!(
        response.items.is_empty(),
        "replacement removes deleted records"
    );
}
