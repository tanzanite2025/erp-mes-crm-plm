use std::env;
use std::fs;
use std::io::{self, Read};
use std::process::ExitCode;
use xdfc_vehicle_loading_engine_core::{parse_glb, ParserLimits};

fn print_usage() {
    eprintln!(
        "用法: xdfc-vehicle-geometry-parser [--input <GLB路径>]\n\
         未提供 --input 时从 stdin 读取 GLB，解析结果写入 stdout。"
    );
}

fn read_input(args: &[String]) -> Result<Vec<u8>, String> {
    if let Some(index) = args.iter().position(|arg| arg == "--input") {
        let path = args
            .get(index + 1)
            .ok_or_else(|| "--input 缺少文件路径".to_owned())?;
        return fs::read(path).map_err(|error| format!("读取 GLB 失败: {}", error));
    }

    let mut input = Vec::new();
    io::stdin()
        .read_to_end(&mut input)
        .map_err(|error| format!("读取 stdin 失败: {}", error))?;
    Ok(input)
}

fn run(args: &[String]) -> Result<(), String> {
    if args.iter().any(|arg| arg == "--help" || arg == "-h") {
        print_usage();
        return Ok(());
    }
    let input = read_input(args)?;
    let geometry = parse_glb(&input, &ParserLimits::default())
        .map_err(|error| format!("解析 GLB 失败: {}", error))?;
    let output = serde_json::to_string_pretty(&geometry)
        .map_err(|error| format!("序列化解析结果失败: {}", error))?;
    println!("{}", output);
    Ok(())
}

fn main() -> ExitCode {
    let args = env::args().skip(1).collect::<Vec<_>>();
    if let Err(error) = run(&args) {
        eprintln!("{}", error);
        print_usage();
        return ExitCode::from(2);
    }
    ExitCode::SUCCESS
}
