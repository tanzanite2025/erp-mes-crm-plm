use anyhow::{anyhow, Result};
use dotenvy::dotenv;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tokio::time::{sleep, Duration};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct IntegrityResult {
    anomalies: Vec<String>,
    #[serde(rename = "isHealing")]
    is_healing: bool,
    details: Vec<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let database_url = env::var("DATABASE_URL")
        .map_err(|_| anyhow!("DATABASE_URL is required for watchdog startup"))?;
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://redis:6379".to_string());

    println!("[WATCHDOG] XDFC 鏋佽嚧鐩戞帶鍝ㄥ叺宸插惎鍔?(Rust Engine)");
    println!(
        "[WATCHDOG] 鐩爣鏁版嵁搴? {}",
        database_url.split('@').last().unwrap_or("unknown")
    );

    // 1. 鍒濆鍖栬祫婧愯繛鎺ユ睜
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&database_url)
        .await?;

    let client = redis::Client::open(redis_url)?;
    let mut con = client.get_async_connection().await?;

    let mut last_anomaly_count = -1i32;

    loop {
        match perform_audit(&pool).await {
            Ok(current_status) => {
                let current_count = current_status.anomalies.len() as i32;

                if current_count != last_anomaly_count {
                    println!(
                        "[WATCHDOG][SIGNAL] 绯荤粺鐘舵€佷粠 {} 婕傜Щ鑷?{}锛屽悓姝ヨ嚦鎬荤嚎...",
                        last_anomaly_count, current_count
                    );

                    // A. 鍐欏叆 Redis KV 缂撳瓨渚?Go 鍚庣璇诲彇
                    let json = serde_json::to_string(&current_status)?;
                    let _: () = con.set("global:integrity:status", json).await?;

                    // B. 鍙戝竷瀹炴椂鐨?PubSub 鍒锋柊鎸囦护
                    let signal = serde_json::json!({
                        "type": "SYSTEM_STATUS_CHANGE",
                        "ts": chrono::Utc::now().timestamp(),
                        "source": "rust_watchdog"
                    });
                    let _: () = con
                        .publish("xdfc_notifications", signal.to_string())
                        .await?;

                    last_anomaly_count = current_count;
                }
            }
            Err(e) => {
                eprintln!("[WATCHDOG][ERROR] 瀹¤浠诲姟鐢变簬鐗╃悊鏁呴殰涓柇: {}", e);
                let busy_status = IntegrityResult {
                    anomalies: vec!["DATABASE_QUERY_BUSY".to_string()],
                    details: vec![format!("Probe Failed: {}", e)],
                    ..Default::default()
                };
                let json = serde_json::to_string(&busy_status)?;
                let _: () = con.set("global:integrity:status", json).await?;
                last_anomaly_count = 1;
            }
        }

        // 宸ヤ笟绾ч噰鏍烽鐜囷細姣?15 绉掓墽琛屼竴娆″叏閾捐矾鎸囩汗婧簮
        sleep(Duration::from_secs(15)).await;
    }
}

/// 鎵ц娣卞害鎸囩汗瀹¤
async fn perform_audit(pool: &sqlx::PgPool) -> Result<IntegrityResult> {
    let mut result = IntegrityResult::default();

    // --- Infrastructure Rule ---
    let dirs = vec!["uploads", "backups"];
    for d in dirs {
        // Rust 鐨?FS 鎺㈡祴鍑犱箮闆跺紑閿€
        if !std::path::Path::new(d).exists() {
            let _ = std::fs::create_dir_all(d);
        }

        let test_file = format!("{}/.watchdog_probe", d);
        if let Err(e) = std::fs::write(&test_file, "ping") {
            result.anomalies.push("FS_PERMISSION_DENIED".to_string());
            result
                .details
                .push(format!("Storage Failure: {} ({})", d, e));
        } else {
            let _ = std::fs::remove_file(test_file);
        }
    }

    Ok(result)
}


