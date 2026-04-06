/**
 * Data Matrix (DM) 编码业务转换引擎
 * 负责将 14 位工业密文逻辑翻译为结构化的业务明文。
 * 该文件与 UI 完全解耦，可用于报表、导出、PDA 扫码解析等场景。
 */

export interface ParserLabels {
    yearSuffix: string;
    monthSuffix: string;
    categorySuffix: string;
    appearancePrefix: string;
    holesSuffix: string;
    serialPrefix: string;
    base36Suffix: string;
    anyCat: string;
    anyModel: string;
    unknownMonth: string;
    invalidCode: string;
    errorLength: string;
    months: Record<string, string>;
}

export interface ParsedDMResult {
    isValid: boolean;
    error?: string;
    segments: {
        year: string;      // 01-02: 年份
        month: string;     // 03: 月份
        model: string;     // 04-05: 型号
        appearance: string;// 06: 外观
        category: string;  // 07: 类别
        holes: string;     // 08-09: 孔数
        serial: string;    // 10-14: 流水号
    };
    display: {
        fullDescription: string;
        scannableText: string; 
        shortTag: string;
    }
}

/**
 * 解析 14 位 DM 核心序列
 * @param code 14位原始字符串
 * @param options 依赖注入的数据（从 StorageService 异步加载后传入）
 */
export function parseDMCode(
    code: string, 
    options?: {
        appearanceMapping?: Record<string, any>;
        productTypes?: any[];
        products?: any[];
        labels?: ParserLabels;
    }
): ParsedDMResult {
    const labels = options?.labels

    // 基础长度校验
    if (!code || code.length !== 14) {
        return {
            isValid: false,
            error: labels?.errorLength || 'Invalid code length (14 chars required)',
            segments: { year: '', month: '', model: '', appearance: '', category: '', holes: '', serial: '' },
            display: { 
                fullDescription: labels?.invalidCode || 'Invalid Code', 
                scannableText: 'INVALID', 
                shortTag: 'ERROR' 
            }
        };
    }

    const raw = {
        year: code.substring(0, 2),
        month: code.substring(2, 3),
        model: code.substring(3, 5),
        appearance: code.substring(5, 6),
        category: code.substring(6, 7),
        holes: code.substring(7, 9),
        serial: code.substring(9, 14)
    };

    // 1. 年份处理 (25 -> 2025)
    const yearDisplay = `20${raw.year}${labels?.yearSuffix || ''}`;

    // 2. 月份处理 (1-9, 0, N, D)
    const monthDisplay = (labels?.months && labels.months[raw.month]) || labels?.unknownMonth || 'Unknown Month';

    // 3. 外观映射 (改为依赖注入)
    let appearanceDisplay = `${labels?.appearancePrefix || 'Appearance'}[${raw.appearance}]`;
    const mapping = options?.appearanceMapping;
    if (mapping && mapping[raw.appearance]) {
        appearanceDisplay = mapping[raw.appearance].label;
    }

    // 4. 类别+孔数处理 (改为依赖注入)
    const catCode = raw.category;
    const holes = raw.holes;
    let categoryName = catCode === '*' ? (labels?.anyCat || 'ANY (*)') : (catCode + (labels?.categorySuffix || ' Cat'));

    const types = options?.productTypes;
    if (types) {
        // 匹配编码首字母 (二级分类)
        const type = types.find((t: any) => t.code && t.code.substring(0, 1).toUpperCase() === catCode && t.parentId);
        if (type) {
            categoryName = type.name;
        }
    }
    
    // 5. 型号处理 (改为依赖注入)
    let modelName = raw.model === '**' ? (labels?.anyModel || 'ANY (**)') : raw.model;
    const products = options?.products;
    if (products) {
        const product = products.find((p: any) => p.modelCode === raw.model);
        if (product) {
            modelName = product.name;
        }
    }

    const isEnglish = !labels?.yearSuffix // Simple heuristic for now

    // 拼接完整描述
    let fullDesc = `${yearDisplay}${labels?.monthSuffix || ''}${monthDisplay} · ${categoryName} · ${modelName} · ${appearanceDisplay} · ${holes}${labels?.holesSuffix || ' Holes'} · ${labels?.serialPrefix || 'Serial'}:${raw.serial}${labels?.base36Suffix || ' (Base-36)'}`;
    
    if (isEnglish) {
        // Switch order for better readability: "Nov 2025 · ..."
        fullDesc = `${monthDisplay} ${yearDisplay} · ${categoryName} · ${modelName} · ${appearanceDisplay} · ${holes}${labels?.holesSuffix || ' Holes'} · ${labels?.serialPrefix || 'Serial'}:${raw.serial}${labels?.base36Suffix || ' (Base-36)'}`;
    }

    const scannableText = `${monthDisplay} ${categoryName.substring(0, 2)} ${modelName} ${appearanceDisplay} ${holes} ${raw.serial}`;
    const shortTag = `${appearanceDisplay}-${categoryName}-${holes}H`;

    return {
        isValid: true,
        segments: raw,
        display: {
            fullDescription: fullDesc,
            scannableText: scannableText,
            shortTag: shortTag
        }
    };
}
