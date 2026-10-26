use crate::business_record_search_ranked_substring_collector::RankedBusinessRecordSubstringCollector;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeSet,
    sync::{Arc, Mutex, RwLock},
    time::{Duration, Instant},
};
use tantivy::{
    doc,
    query::{BooleanQuery, Occur, Query, TermQuery},
    schema::*,
    tokenizer::NgramTokenizer,
    Index, IndexReader, IndexWriter, Term,
};
use unicode_normalization::UnicodeNormalization;

type SearchServiceError = (StatusCode, String);

const BUSINESS_RECORD_SEARCH_CANDIDATE_WINDOW_LIMIT: usize = 100000;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct BusinessRecordSearchDocument {
    pub id: String,
    pub code: String,
    pub name: String,
    pub model: String,
    pub category: String,
    #[serde(default)]
    pub restricted_to_users: bool,
    #[serde(default)]
    pub allowed_user_ids: Vec<String>,
}

#[derive(Clone, Deserialize)]
pub struct BusinessRecordSearchRequest {
    pub q: String,
    pub categories: Vec<String>,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub can_manage: bool,
    pub limit: usize,
    pub offset: usize,
    #[serde(default)]
    pub generation: String,
}

#[derive(Debug, Serialize)]
pub struct BusinessRecordSearchHit {
    pub id: String,
    pub category: String,
    pub score: u32,
}

#[derive(Debug, Serialize)]
pub struct BusinessRecordSearchResponse {
    pub items: Vec<BusinessRecordSearchHit>,
    pub has_more: bool,
    pub generation: String,
}

struct BusinessRecordSearchSnapshot {
    generation: String,
    index: Index,
    reader: IndexReader,
    writer: IndexWriter,
}

impl BusinessRecordSearchSnapshot {
    fn create_empty_business_record_search_snapshot() -> tantivy::Result<Self> {
        let mut schema = Schema::builder();
        schema.add_text_field("document", STORED);
        schema.add_text_field("category", STRING);
        schema.add_text_field("access", STRING);
        schema.add_text_field(
            "search_text",
            TextOptions::default().set_indexing_options(
                TextFieldIndexing::default()
                    .set_tokenizer("business_substrings")
                    .set_index_option(IndexRecordOption::Basic),
            ),
        );
        let index = Index::create_in_ram(schema.build());
        index
            .tokenizers()
            .register("business_substrings", NgramTokenizer::new(1, 3, false)?);
        let writer = index.writer(50_000_000)?;
        let reader = index.reader()?;
        Ok(Self {
            generation: uuid::Uuid::new_v4().to_string(),
            index,
            reader,
            writer,
        })
    }

    fn append_business_record_search_documents(
        &mut self,
        documents: Vec<BusinessRecordSearchDocument>,
    ) -> anyhow::Result<()> {
        let schema = self.index.schema();
        let document_field = schema.get_field("document")?;
        let category_field = schema.get_field("category")?;
        let access_field = schema.get_field("access")?;
        let text_field = schema.get_field("search_text")?;
        for record in documents {
            let text = normalize_business_record_search_text(&record.model);
            let mut indexed_document = doc!(
                document_field => serde_json::to_string(&record)?,
                category_field => record.category,
                text_field => text
            );
            if record.restricted_to_users {
                for user_id in record.allowed_user_ids {
                    indexed_document.add_text(access_field, format!("user:{user_id}"));
                }
            } else {
                indexed_document.add_text(access_field, "public");
            }
            self.writer.add_document(indexed_document)?;
        }
        Ok(())
    }

    fn search_business_record_snapshot(
        &self,
        request: &BusinessRecordSearchRequest,
    ) -> anyhow::Result<BusinessRecordSearchResponse> {
        let normalized_query = normalize_business_record_search_text(&request.q);
        let keywords: Vec<&str> = normalized_query.split_whitespace().collect();
        if keywords.is_empty() || request.categories.is_empty() {
            return Ok(BusinessRecordSearchResponse {
                items: vec![],
                has_more: false,
                generation: self.generation.clone(),
            });
        }
        let schema = self.index.schema();
        let text_field = schema.get_field("search_text")?;
        let category_field = schema.get_field("category")?;
        let access_field = schema.get_field("access")?;
        let document_field = schema.get_field("document")?;
        let mut clauses: Vec<(Occur, Box<dyn Query>)> = Vec::new();
        // Literal n-grams avoid QueryParser syntax, punctuation and Chinese word
        // segmentation surprises. Verify full substrings before ranking/paging.
        let mut grams = BTreeSet::new();
        for keyword in &keywords {
            let characters: Vec<char> = keyword.chars().collect();
            for window in characters.windows(characters.len().min(3)) {
                grams.insert(window.iter().collect::<String>());
            }
        }
        for gram in grams {
            clauses.push((
                Occur::Must,
                Box::new(TermQuery::new(
                    Term::from_field_text(text_field, &gram),
                    IndexRecordOption::Basic,
                )),
            ));
        }
        let categories: Vec<(Occur, Box<dyn Query>)> = request
            .categories
            .iter()
            .map(|category| {
                (
                    Occur::Should,
                    Box::new(TermQuery::new(
                        Term::from_field_text(category_field, category),
                        IndexRecordOption::Basic,
                    )) as Box<dyn Query>,
                )
            })
            .collect();
        clauses.push((Occur::Must, Box::new(BooleanQuery::new(categories))));
        if !request.can_manage {
            let mut access: Vec<(Occur, Box<dyn Query>)> = vec![(
                Occur::Should,
                Box::new(TermQuery::new(
                    Term::from_field_text(access_field, "public"),
                    IndexRecordOption::Basic,
                )),
            )];
            if !request.user_id.is_empty() {
                access.push((
                    Occur::Should,
                    Box::new(TermQuery::new(
                        Term::from_field_text(access_field, &format!("user:{}", request.user_id)),
                        IndexRecordOption::Basic,
                    )),
                ));
            }
            clauses.push((Occur::Must, Box::new(BooleanQuery::new(access))));
        }
        let searcher = self.reader.searcher();
        let matches = searcher
            .search(
                &BooleanQuery::new(clauses),
                &RankedBusinessRecordSubstringCollector {
                    document_field,
                    query: Arc::new(normalized_query.clone()),
                    keywords: Arc::new(
                        keywords
                            .iter()
                            .map(|keyword| (*keyword).to_owned())
                            .collect(),
                    ),
                    capacity: request.offset + request.limit + 1,
                },
            )?
            .map_err(anyhow::Error::msg)?;
        let has_more = matches.len() > request.offset.saturating_add(request.limit);
        let items = matches
            .into_iter()
            .skip(request.offset)
            .take(request.limit)
            .map(|(score, _, category, id)| BusinessRecordSearchHit {
                id,
                category,
                score: score.0,
            })
            .collect();
        Ok(BusinessRecordSearchResponse {
            items,
            has_more,
            generation: self.generation.clone(),
        })
    }
}

pub(super) fn normalize_business_record_search_text(text: &str) -> String {
    text.nfkc()
        .flat_map(char::to_lowercase)
        .collect::<String>()
        .trim()
        .to_owned()
}

struct PendingBusinessRecordSearchSnapshot {
    token: String,
    last_batch_at: Instant,
    snapshot: BusinessRecordSearchSnapshot,
}

#[derive(Deserialize)]
struct BusinessRecordSearchSnapshotPublication {
    generation: String,
}

#[derive(Default)]
struct BusinessRecordSearchState {
    active: RwLock<Option<Arc<BusinessRecordSearchSnapshot>>>,
    pending: Mutex<Option<PendingBusinessRecordSearchSnapshot>>,
}

fn business_record_search_internal_error(error: impl std::fmt::Display) -> SearchServiceError {
    tracing::error!(error = %error, "Business record search failed");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "business record search failed".to_owned(),
    )
}

async fn begin_business_record_search_snapshot(
    State(state): State<Arc<BusinessRecordSearchState>>,
) -> Result<Json<serde_json::Value>, SearchServiceError> {
    tokio::task::spawn_blocking(move || {
        let mut pending = state
            .pending
            .lock()
            .map_err(business_record_search_internal_error)?;
        if pending
            .as_ref()
            .is_some_and(|snapshot| snapshot.last_batch_at.elapsed() < Duration::from_secs(120))
        {
            return Err((
                StatusCode::CONFLICT,
                "another snapshot is being built".to_owned(),
            ));
        }
        let token = uuid::Uuid::new_v4().to_string();
        let snapshot = BusinessRecordSearchSnapshot::create_empty_business_record_search_snapshot()
            .map_err(business_record_search_internal_error)?;
        *pending = Some(PendingBusinessRecordSearchSnapshot {
            token: token.clone(),
            last_batch_at: Instant::now(),
            snapshot,
        });
        Ok(Json(serde_json::json!({"token": token})))
    })
    .await
    .map_err(business_record_search_internal_error)?
}

async fn append_business_record_search_snapshot_batch(
    State(state): State<Arc<BusinessRecordSearchState>>,
    Path(token): Path<String>,
    Json(documents): Json<Vec<BusinessRecordSearchDocument>>,
) -> Result<Json<serde_json::Value>, SearchServiceError> {
    if documents.len() > 250 {
        return Err((
            StatusCode::BAD_REQUEST,
            "at most 250 documents per batch".to_owned(),
        ));
    }
    tokio::task::spawn_blocking(move || {
        let mut pending = state
            .pending
            .lock()
            .map_err(business_record_search_internal_error)?;
        let snapshot = pending
            .as_mut()
            .filter(|snapshot| snapshot.token == token)
            .ok_or((
                StatusCode::CONFLICT,
                "snapshot token is no longer active".to_owned(),
            ))?;
        snapshot
            .snapshot
            .append_business_record_search_documents(documents)
            .map_err(business_record_search_internal_error)?;
        snapshot.last_batch_at = Instant::now();
        Ok(Json(serde_json::json!({"accepted": true})))
    })
    .await
    .map_err(business_record_search_internal_error)?
}

async fn publish_business_record_search_snapshot(
    State(state): State<Arc<BusinessRecordSearchState>>,
    Path(token): Path<String>,
    Json(publication): Json<BusinessRecordSearchSnapshotPublication>,
) -> Result<Json<serde_json::Value>, SearchServiceError> {
    if publication.generation.is_empty() || publication.generation.len() > 128 {
        return Err((
            StatusCode::BAD_REQUEST,
            "invalid snapshot generation".to_owned(),
        ));
    }
    tokio::task::spawn_blocking(move || {
        let mut pending = state
            .pending
            .lock()
            .map_err(business_record_search_internal_error)?;
        if pending
            .as_ref()
            .is_none_or(|snapshot| snapshot.token != token)
        {
            return Err((
                StatusCode::CONFLICT,
                "snapshot token is no longer active".to_owned(),
            ));
        }
        let mut completed = pending
            .take()
            .ok_or_else(|| business_record_search_internal_error("missing snapshot"))?;
        completed
            .snapshot
            .writer
            .commit()
            .map_err(business_record_search_internal_error)?;
        completed
            .snapshot
            .reader
            .reload()
            .map_err(business_record_search_internal_error)?;
        completed.snapshot.generation = publication.generation;
        *state
            .active
            .write()
            .map_err(business_record_search_internal_error)? = Some(Arc::new(completed.snapshot));
        Ok(Json(serde_json::json!({"published": true})))
    })
    .await
    .map_err(business_record_search_internal_error)?
}

async fn abort_business_record_search_snapshot(
    State(state): State<Arc<BusinessRecordSearchState>>,
    Path(token): Path<String>,
) -> Result<Json<serde_json::Value>, SearchServiceError> {
    tokio::task::spawn_blocking(move || {
        let mut pending = state
            .pending
            .lock()
            .map_err(business_record_search_internal_error)?;
        if pending
            .as_ref()
            .is_some_and(|snapshot| snapshot.token == token)
        {
            *pending = None;
        }
        Ok(Json(serde_json::json!({"discarded": true})))
    })
    .await
    .map_err(business_record_search_internal_error)?
}

async fn search_business_record_index(
    State(state): State<Arc<BusinessRecordSearchState>>,
    Json(request): Json<BusinessRecordSearchRequest>,
) -> Result<Json<BusinessRecordSearchResponse>, SearchServiceError> {
    if request.limit == 0
        || request.limit > 100
        || request.offset >= BUSINESS_RECORD_SEARCH_CANDIDATE_WINDOW_LIMIT
        || request.limit > BUSINESS_RECORD_SEARCH_CANDIDATE_WINDOW_LIMIT - request.offset
        || request.q.chars().count() > 200
        || request.q.split_whitespace().count() > 8
        || request.generation.len() > 128
        || (request.offset > 0 && request.generation.is_empty())
    {
        return Err((
            StatusCode::BAD_REQUEST,
            "invalid search query or pagination".to_owned(),
        ));
    }
    let active = state
        .active
        .read()
        .map_err(business_record_search_internal_error)?
        .clone()
        .ok_or((
            StatusCode::SERVICE_UNAVAILABLE,
            "search index is waiting for its initial complete snapshot".to_owned(),
        ))?;
    if !request.generation.is_empty() && request.generation != active.generation {
        return Err((
            StatusCode::CONFLICT,
            "search snapshot changed; restart pagination".to_owned(),
        ));
    }
    tokio::task::spawn_blocking(move || {
        active
            .search_business_record_snapshot(&request)
            .map(Json)
            .map_err(business_record_search_internal_error)
    })
    .await
    .map_err(business_record_search_internal_error)?
}

pub fn build_business_record_search_router() -> Router {
    Router::new()
        .route("/v1/search", post(search_business_record_index))
        .route(
            "/v1/index/snapshot/start",
            post(begin_business_record_search_snapshot),
        )
        .route(
            "/v1/index/snapshot/:token/batch",
            post(append_business_record_search_snapshot_batch),
        )
        .route(
            "/v1/index/snapshot/:token/publish",
            post(publish_business_record_search_snapshot),
        )
        .route(
            "/v1/index/snapshot/:token/abort",
            post(abort_business_record_search_snapshot),
        )
        .layer(axum::extract::DefaultBodyLimit::max(16 * 1024 * 1024))
        .with_state(Arc::new(BusinessRecordSearchState::default()))
}

#[cfg(test)]
#[path = "business_record_search_substring_permissions_and_snapshot_tests.rs"]
mod business_record_search_substring_permissions_and_snapshot_tests;
