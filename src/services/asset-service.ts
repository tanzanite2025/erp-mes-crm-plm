import { apiFetch } from '@/lib/api-client'

export interface UploadResponse {
    status: string;
    url: string;
    fileName: string;
    size: number;
}

/**
 * AssetService - 处理业务无关的资源上传（如图片、图纸物理文件）
 */
export const AssetService = {
    /**
     * 上传单个文件到服务器
     * @param file 原生 File 对象
     * @returns 返回包含服务器物理 URL 的对象
     */
    async uploadFile(file: File): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const res = await apiFetch<UploadResponse>('/assets/upload', {
            method: 'POST',
            body: formData,
            // 注意：不要手动设置 Content-Type，api-client 已优化，fetch 会自动处理 multipart boundary
        });

        // [FAIL LOUDLY] Ensure the server actually provided a URL
        if (!res || !res.url) {
            throw new Error('[ASSET_UPLOAD] File upload succeeded at network level, but no URL was returned by the server.');
        }

        return res;
    }
}
