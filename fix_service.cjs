const fs = require('fs');
const path = 'C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/engineering/services/excel-service.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

let newLines = [];
let fixedCount = 0;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 恢复 safelyGetCellValue 定义
    if (line.includes('应对用户从外部带有样式、富文本')) {
        newLines.push(line);
        newLines.push("        const safelyGetCellValue = (cell: ExcelJS.Cell): string => {");
        fixedCount++;
        continue;
    }
    
    // 修复 281-297 区域的大括号缺失
    if (line.includes('if (mCombo && mId) {')) {
        let blockLines = [line];
        let j = i + 1;
        while (j < lines.length && !lines[j].includes('产品映射')) {
            blockLines.push(lines[j]);
            j++;
        }
        // 重新构建该块
        newLines.push("                if (mCombo && mId) {");
        newLines.push("                    comboToIdMap.set(mCombo, mId);");
        newLines.push("                    if (mName) {");
        newLines.push("                        const mCode = mCombo.match(/\\[(.*?)\\]/)?.[1] || mId;");
        newLines.push("                        if (!extractedMaterials.find(x => x.id === mId)) {");
        newLines.push("                            extractedMaterials.push({");
        newLines.push("                                id: mId, code: mCode, name: mName, spec: mSpec,");
        newLines.push("                                uom: mUnit || 'pcs', costPrice: isNaN(mPrice) ? 0 : mPrice,");
        newLines.push("                                category: 'RAW_MATERIAL'");
        newLines.push("                            });");
        newLines.push("                        }");
        newLines.push("                    }");
        newLines.push("                }");
        fixedCount++;
        i = j - 1; // 跳过已处理行
        continue;
    }

    // 修复 385-405 区域的大括号缺失 (反向补充块)
    if (line.includes('if (materialId && !extractedMaterials.find')) {
        newLines.push("            if (materialId && !extractedMaterials.find(x => x.id === materialId)) {");
        newLines.push("                const mName = safelyGetCellValue(row.getCell(3));");
        newLines.push("                const mSpec = safelyGetCellValue(row.getCell(4));");
        newLines.push("                const mUnit = safelyGetCellValue(row.getCell(5));");
        newLines.push("                const mPrice = parseFloat(safelyGetCellValue(row.getCell(6)));");
        newLines.push("                const sectionCategories = (SECTION_TO_CATEGORY as any)[section || ''] || ['RAW_MATERIAL'];");
        newLines.push("                const autoCategory = sectionCategories[0];");
        newLines.push("                if (mName) {");
        newLines.push("                    extractedMaterials.push({");
        newLines.push("                        id: materialId, code: comboText.match(/\\[(.*?)\\]/)?.[1] || materialId,");
        newLines.push("                        name: mName, spec: mSpec, uom: mUnit || 'pcs',");
        newLines.push("                        costPrice: isNaN(mPrice) ? 0 : mPrice, category: autoCategory");
        newLines.push("                    });");
        newLines.push("                }");
        newLines.push("            }");
        fixedCount++;
        // 跳过旧块，直到 items.push
        while (i + 1 < lines.length && !lines[i+1].includes('items.push')) {
            i++;
        }
        continue;
    }

    newLines.push(line);
}

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log(`Structure fix applied: ${fixedCount} major blocks restored.`);
