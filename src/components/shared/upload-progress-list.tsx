'use client';

import { X, FileIcon, ImageIcon, FileVideo, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadStore } from '@/stores/upload-store';
import { cn } from '@/lib/utils';

function getFileIcon(contentType: string) {
    if (contentType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (contentType.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
    if (contentType.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadProgressListProps {
    conversationId: string;
}

export function UploadProgressList({ conversationId }: UploadProgressListProps) {
    const uploads = useUploadStore((state) => state.uploads);
    const cancelUpload = useUploadStore((state) => state.cancelUpload);
    const removeUpload = useUploadStore((state) => state.removeUpload);

    const relevantUploads = Array.from(uploads.values()).filter(
        (u) => u.conversationId === conversationId
    );

    if (relevantUploads.length === 0) return null;

    return (
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50">
            <div className="flex flex-wrap gap-2">
                {relevantUploads.map((upload) => {
                    const progress = upload.fileSize > 0 ? Math.round((upload.uploadedBytes / upload.fileSize) * 100) : 0;

                    return (
                        <div
                            key={upload.id}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600',
                                upload.status === 'FAILED' && 'border-red-600/50 bg-red-900/20',
                                upload.status === 'COMPLETED' && 'border-emerald-600/50 bg-emerald-900/20'
                            )}
                        >
                            {getFileIcon(upload.contentType)}

                            <div className="flex flex-col min-w-0">
                                <span className="text-xs text-slate-200 truncate max-w-37.5">{upload.fileName}</span>
                                <span className="text-[10px] text-slate-400">
                                    {upload.status === 'IN_PROGRESS' && `${progress}% - `}
                                    {formatFileSize(upload.uploadedBytes)} / {formatFileSize(upload.fileSize)}
                                </span>
                            </div>

                            {upload.status === 'IN_PROGRESS' && (
                                <div className="w-16 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                                </div>
                            )}

                            {upload.status === 'COMPLETED' && <span className="text-emerald-400 text-xs">Done</span>}
                            {upload.status === 'FAILED' && <span className="text-red-400 text-xs">Failed</span>}

                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => {
                                    if (upload.status === 'IN_PROGRESS' || upload.status === 'PENDING') cancelUpload(upload.id);
                                    else removeUpload(upload.id);
                                }}
                                className="h-5 w-5 text-slate-400 hover:text-slate-100"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
