use axum::body::Bytes;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, RwLock};
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::*;
use tantivy::{doc, Index, IndexReader, IndexWriter, ReloadPolicy};

mod processor;

// --- Data Models ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchDocument {
    pub id: String,
    pub code: String,
    pub name: String,
    pub model: Option<String>,
    pub category: String,
    pub version: u64,
}

#[derive(Deserialize)]
pub struct SearchParams {
    pub q: String,
    pub limit: Option<usize>,
}

#[derive(Serialize)]
pub struct SearchResult {
    pub id: String,
    pub category: String,
    pub score: f32,
}

#[derive(Serialize)]
pub struct SearchResponse {
    pub items: Vec<SearchResult>,
    pub total: usize,
    pub took_ms: u128,
}

#[derive(Serialize)]
pub struct ImageProcessResponse {
    pub phash: String,
    pub webp_base64: String,
    pub width: u32,
    pub height: u32,
}

// --- App State ---

struct AppState {
    index: Index,
    reader: IndexReader,
    writer: Arc<RwLock<IndexWriter>>,
    schema: Schema,
}

// --- Handlers ---

async fn health_check() -> &'static str {
    "OK"
}

async fn index_document(
    State(state): State<Arc<AppState>>,
    Json(doc): Json<SearchDocument>,
) -> impl IntoResponse {
    let mut writer = state.writer.write().unwrap();
    let schema = &state.schema;

    let id_field = schema.get_field("id").unwrap();
    let code_field = schema.get_field("code").unwrap();
    let name_field = schema.get_field("name").unwrap();
    let model_field = schema.get_field("model").unwrap();
    let category_field = schema.get_field("category").unwrap();
    let version_field = schema.get_field("version").unwrap();

    // 简单原子更新：先删再加 (SDRTS 模式)
    let term = tantivy::Term::from_field_text(id_field, &doc.id);
    writer.delete_term(term);

    let mut tantivy_doc = doc!(
        id_field => doc.id,
        code_field => doc.code,
        name_field => doc.name,
        category_field => doc.category,
        version_field => doc.version
    );

    if let Some(m) = doc.model {
        tantivy_doc.add_text(model_field, m);
    }

    writer.add_document(tantivy_doc).unwrap();
    writer.commit().unwrap();

    (StatusCode::OK, "Indexed")
}

async fn delete_document(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let mut writer = state.writer.write().unwrap();
    let schema = &state.schema;

    let id_field = schema.get_field("id").unwrap();
    let term = tantivy::Term::from_field_text(id_field, &id);
    writer.delete_term(term);
    writer.commit().unwrap();

    (StatusCode::OK, "Deleted")
}

async fn search(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchParams>,
) -> impl IntoResponse {
    let start = std::time::Instant::now();
    let searcher = state.reader.searcher();
    let schema = &state.schema;

    let code_field = schema.get_field("code").unwrap();
    let name_field = schema.get_field("name").unwrap();
    let model_field = schema.get_field("model").unwrap();

    let query_parser =
        QueryParser::for_index(&state.index, vec![code_field, name_field, model_field]);
    let query = query_parser.parse_query(&params.q).unwrap();

    let limit = params.limit.unwrap_or(20);
    let top_docs = searcher
        .search(&query, &TopDocs::with_limit(limit))
        .unwrap();

    let id_field = schema.get_field("id").unwrap();
    let category_field = schema.get_field("category").unwrap();
    let mut results = Vec::new();
    for (score, doc_address) in top_docs {
        let retrieved_doc = searcher.doc(doc_address).unwrap();
        let id = retrieved_doc
            .get_first(id_field)
            .and_then(|v| v.as_text())
            .unwrap()
            .to_string();
        let category = retrieved_doc
            .get_first(category_field)
            .and_then(|v| v.as_text())
            .unwrap_or("")
            .to_string();
        results.push(SearchResult {
            id,
            category,
            score,
        });
    }

    let total = results.len();

    let response = SearchResponse {
        items: results,
        total,
        took_ms: start.elapsed().as_millis(),
    };

    Json(response)
}

async fn process_image_handler(
    body: Bytes,
) -> Result<Json<ImageProcessResponse>, (StatusCode, String)> {
    let body_prefix_hex = body
        .iter()
        .take(16)
        .map(|byte| format!("{:02X}", byte))
        .collect::<Vec<_>>()
        .join(" ");
    tracing::info!(
        body_len = body.len(),
        body_prefix = %body_prefix_hex,
        "Received image processing request"
    );

    let result = processor::process_image(&body).map_err(|e| {
        let message = e.to_string();
        tracing::error!(
            error = %message,
            body_len = body.len(),
            body_prefix = %body_prefix_hex,
            "Image processing failed"
        );
        (StatusCode::BAD_REQUEST, message)
    })?;

    use base64::{engine::general_purpose, Engine as _};
    let webp_base64 = general_purpose::STANDARD.encode(&result.webp_data);

    Ok(Json(ImageProcessResponse {
        phash: result.phash,
        webp_base64,
        width: result.width,
        height: result.height,
    }))
}

// --- Main ---

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    // 1. 定义 Schema
    let mut schema_builder = Schema::builder();
    schema_builder.add_text_field("id", STRING | STORED);
    schema_builder.add_text_field("code", TEXT | STORED | FAST);
    schema_builder.add_text_field("name", TEXT | STORED);
    schema_builder.add_text_field("model", TEXT | STORED);
    schema_builder.add_text_field("category", STRING | STORED);
    schema_builder.add_u64_field("version", STORED | FAST);
    let schema = schema_builder.build();

    // 2. 初始化 Index (内存模式用于演示，生产环境应使用 Mmap)
    let index = Index::create_in_ram(schema.clone());

    // 3. 初始化 Writer/Reader
    let writer = index.writer(50_000_000)?; // 50MB heap
    let reader = index
        .reader_builder()
        .reload_policy(ReloadPolicy::OnCommit)
        .try_into()?;

    let state = Arc::new(AppState {
        index,
        reader,
        writer: Arc::new(RwLock::new(writer)),
        schema,
    });

    // 4. 构建路由
    let app = Router::new()
        .route("/v1/health", get(health_check))
        .route("/v1/index", post(index_document))
	    .route("/v1/index/:id", delete(delete_document))
        .route("/v1/search", get(search))
        .route(
            "/v1/process-image",
            post(process_image_handler)
                .layer(axum::extract::DefaultBodyLimit::max(10 * 1024 * 1024)),
        )
        .with_state(state);

    // 5. 启动服务
    let addr = SocketAddr::from(([0, 0, 0, 0], 8081));
    tracing::info!("XDFC Search Engine starting on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
