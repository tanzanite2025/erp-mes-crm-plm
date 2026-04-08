use anyhow::{Context, Result};
use image::GenericImageView;
use img_hash::image::{DynamicImage as HashDynamicImage, RgbaImage as HashRgbaImage};
use img_hash::{HasherConfig, HashAlg};
use webp::{Encoder, WebPMemory};

/**
 * 图像处理核心模块 (Image Processor)
 * 职责: 
 *   1. 计算感知哈希 (pHash) 用于视觉查重
 *   2. 执行 WebP 工业级压缩
 */
pub struct ProcessedImage {
    pub phash: String,
    pub webp_data: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

pub fn process_image(raw_data: &[u8]) -> Result<ProcessedImage> {
    // 1. 解码图片
    let img = image::load_from_memory(raw_data)
        .context("Failed to decode image from memory")?;
    
    let (width, height) = img.dimensions();

    // 2. 计算感知哈希 (pHash)
    // 使用 Gradient 算法，对缩放和亮度变化不敏感，非常适合截图查重
    let hasher = HasherConfig::new()
        .hash_size(8, 8)
        .hash_alg(HashAlg::Gradient)
        .to_hasher();

    let rgba = img.to_rgba8();
    let hash_rgba = HashRgbaImage::from_raw(width, height, rgba.as_raw().clone())
        .context("Failed to normalize image pixels for perceptual hash")?;
    let hash_img = HashDynamicImage::ImageRgba8(hash_rgba);
    let hash = hasher.hash_image(&hash_img);
    let phash_hex = hash.to_base64(); // 使用 base64 减少字符串长度，也可使用 to_string() 16进制

    // 3. 执行 WebP 压缩
    // 设置质量为 75，这是工业凭据平衡清晰度与体积的黄金点
    let encoder = Encoder::from_rgba(rgba.as_raw(), width, height);
    
    let webp_memory: WebPMemory = encoder.encode(75.0);
    let webp_data = webp_memory.to_vec();

    if webp_data.is_empty() {
        return Err(anyhow::anyhow!("Failed to encode image to WebP: encoder returned empty payload"));
    }

    Ok(ProcessedImage {
        phash: phash_hex,
        webp_data,
        width,
        height,
    })
}

/**
 * 比较两个哈希值的汉明距离 (Hamming Distance)
 * 距离越小，图片越相似。通常 < 5 可认为高度疑似重复。
 */
pub fn calculate_similarity(hash1: &str, hash2: &str) -> Result<u32> {
    // 这里仅作为逻辑参考，实际查重建议由 Go 或 Redis 的位运算完成以保障高并发
    Ok(0) 
}

#[cfg(test)]
mod tests {
    use super::process_image;

    #[test]
    fn process_image_handles_png_sample() {
        let sample_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("..")
            .join("public")
            .join("images")
            .join("shadcn-admin.png");
        let raw_data = std::fs::read(&sample_path).expect("failed to read PNG sample");

        let result = process_image(&raw_data).expect("process_image should handle PNG sample");

        assert!(result.width > 0);
        assert!(result.height > 0);
        assert!(!result.phash.is_empty());
        assert!(!result.webp_data.is_empty());
    }
}
