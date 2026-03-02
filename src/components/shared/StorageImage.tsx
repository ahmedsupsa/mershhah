'use client';

import React, { useState, useEffect } from 'react';
import Image, { type ImageProps } from 'next/image';
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

type StorageImageProps = {
  imagePath: string | null | undefined;
} & Omit<ImageProps, 'src'>;


export const StorageImage: React.FC<StorageImageProps> = ({ imagePath, alt, ...props }) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchUrl = async () => {
      setIsLoading(true);
      setDownloadUrl(null);
      
      if (!imagePath || imagePath.trim() === '') {
        if (isMounted) setIsLoading(false);
        return;
      }

      if (imagePath.startsWith('http') || imagePath.startsWith('blob:')) {
        if (isMounted) {
          setDownloadUrl(imagePath);
          setIsLoading(false);
        }
        return;
      }

      try {
        const url = await getDownloadURL(ref(storage, imagePath));
        if (isMounted) {
          setDownloadUrl(url);
        }
      } catch (error) {
        if ((error as any).code !== 'storage/object-not-found') {
          console.error(`[StorageImage] Failed to get download URL for ${imagePath}:`, error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [imagePath]);

  const styleProps = props.width && props.height ? { width: props.width, height: props.height } : {};

  if (isLoading) {
    return <Skeleton className={cn("bg-muted", props.className)} style={styleProps} />;
  }

  if (!downloadUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", props.className)} style={styleProps}>
          <ImageIcon className="h-1/2 w-1/2 opacity-50" />
      </div>
    );
  }

  // Provide a default sizes prop for filled images if not provided to satisfy Next.js warnings
  const finalSizes = props.fill && !props.sizes 
    ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
    : props.sizes;

  return (
    <Image
        alt={alt}
        src={downloadUrl}
        {...props}
        sizes={finalSizes}
    />
  );
};
