'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  title: string;
}

export function ImagePreviewDialog({
  isOpen,
  onClose,
  imageSrc,
  title,
}: ImagePreviewDialogProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 animate-in fade-in-0" />
        <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-[90vw] max-h-[90vh] outline-none">
                  {/* 图片和关闭按钮容器 */}
          <div className="flex flex-col items-center">
            <img
              src={imageSrc}
              alt={title}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
            {/* 关闭按钮 - 图片下方居中 */}
            <DialogPrimitive.Close
              className="mt-4 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
            >
              <XIcon className="w-6 h-6 text-white" />
              <span className="sr-only">关闭</span>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
