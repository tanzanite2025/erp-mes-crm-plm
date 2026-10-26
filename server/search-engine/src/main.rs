use axum::{
    body::Bytes,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;
use std::net::SocketAddr;

mod business_record_search_index;
mod business_record_search_ranked_substring_collector;
mod processor;

#[derive(Serialize)]
pub struct ImageProcessResponse {
    pub phash: String,
    pub webp_base64: String,
    pub width: u32,
    pub height: u32,
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

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    let app = Router::new()
        .route("/v1/health", get(|| async { "OK" }))
        .merge(business_record_search_index::build_business_record_search_router())
        .route(
            "/v1/process-image",
            post(process_image_handler)
                .layer(axum::extract::DefaultBodyLimit::max(10 * 1024 * 1024)),
        );
    let port = std::env::var("SEARCH_ENGINE_PORT")
        .unwrap_or_else(|_| "8081".to_owned())
        .parse::<u16>()?;
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("XDFC Rust search/image sidecar starting on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
