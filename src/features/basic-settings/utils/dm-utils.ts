/**
 * DM 编码系统数学工具集
 * 提供 10 进制与 36 进制 (0-9, A-Z) 之间的转换逻辑，用于大幅提升编码容量。
 */

const BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * 将十进制数转换为指定长度的 36 进制字符串
 * @param num 整数
 * @param length 输出长度 (默认 5)
 */
export function toBase36(num: number, length: number = 5): string {
    if (isNaN(num) || num < 0) return '0'.repeat(length);
    
    let result = '';
    let n = Math.floor(num);
    
    if (n === 0) return '0'.repeat(length);
    
    while (n > 0) {
        result = BASE36_CHARS[n % 36] + result;
        n = Math.floor(n / 36);
    }
    
    // 补全位数
    return result.padStart(length, '0').toUpperCase().substring(0, length);
}

/**
 * 将 36 进制字符串还原为十进制数
 * @param str 36进制字符串
 */
export function fromBase36(str: string): number {
    if (!str) return 0;
    
    const s = str.toUpperCase();
    let result = 0;
    
    for (let i = 0; i < s.length; i++) {
        const char = s[i];
        const value = BASE36_CHARS.indexOf(char);
        if (value === -1) continue; // 忽略非法字符
        
        result = result * 36 + value;
    }
    
    return result;
}
