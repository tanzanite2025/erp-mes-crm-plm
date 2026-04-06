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

    println!("[WATCHDOG] XDFC 极致监控哨兵已启动 (Rust Engine)");
    println!(
        "[WATCHDOG] 目标数据库: {}",
        database_url.split('@').last().unwrap_or("unknown")
    );

    // 1. 初始化资源连接池
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&database_url)
        .await?;

    let client = redis::Client::open(redis_url)?;
    let mut con = client.get_async_connection().await?;

    let mut last_anomaly_count = -1i32;

    // 2. 哨兵主审计循环
    loop {
        match perform_audit(&pool).await {
            Ok(current_status) => {
                let current_count = current_status.anomalies.len() as i32;

                // 只有在状态发生“漂移”时，才更新 Redis 并广播信号
                if current_count != last_anomaly_count {
                    println!(
                        "[WATCHDOG][SIGNAL] 系统状态从 {} 漂移至 {}，同步至总线...",
                        last_anomaly_count, current_count
                    );

                    // A. 写入 Redis KV 缓存供 Go 后端读取
                    let json = serde_json::to_string(&current_status)?;
                    let _: () = con.set("global:integrity:status", json).await?;

                    // B. 发布实时的 PubSub 刷新指令
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
                eprintln!("[WATCHDOG][ERROR] 审计任务由于物理故障中断: {}", e);
                // 发生查询错误时（如 DB 宕机），推播 DATABASE_QUERY_BUSY 状态
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

        // 工业级采样频率：每 15 秒执行一次全链路指纹溯源
        sleep(Duration::from_secs(15)).await;
    }
}

/// 执行深度指纹审计
async fn perform_audit(pool: &sqlx::PgPool) -> Result<IntegrityResult> {
    let mut result = IntegrityResult::default();

    // --- 巡检项 1: 核心业务元数据指纹 (Fingerprint Rule) ---
    let golden_groups = vec!["MATERIALS", "ENGINEERING", "TRADING", "PRODUCT"];
    for code in golden_groups {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM dict_groups WHERE code = $1 AND deleted_at IS NULL",
        )
        .bind(code)
        .fetch_one(pool)
        .await?;

        if count == 0 {
            result
                .anomalies
                .push("SYSTEM_DICTIONARY_FINGERPRINT_LOST".to_string());
            result
                .details
                .push(format!("Missing Golden Group: {}", code));
        }
    }

    // --- 巡检项 2: 基础设施环境探针 (Infrastructure Rule) ---
    let dirs = vec!["uploads", "backups"];
    for d in dirs {
        // Rust 的 FS 探测几乎零开销
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
