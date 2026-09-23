import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { BackHeader, Button } from '../components/ui';
import { Avatar, YouPage } from './you/shared';
import { BusySpinner, ErrorNote, Note } from './account/shared';
import getCroppedImg from '../utils/cropImage';
import { useTranslation } from '../contexts/LanguageContext';
import { apiErrorFrom, apiFetch } from '../services/apiClient';

const EditAvatar: React.FC<{ username: string; token: string; onBack: () => void }> = ({ username, token, onBack }) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cacheBuster] = useState(() => Date.now());


    const onCropComplete = useCallback((_a: any, pixels: any) => setCroppedAreaPixels(pixels), []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.size > 5 * 1024 * 1024) { setError(t('avatar.error_size')); return; }
        if (!['image/jpeg', 'image/png'].includes(file.type)) { setError(t('avatar.error_type')); return; }
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setImageSrc(reader.result?.toString() || null);
            setZoom(1);
            setCrop({ x: 0, y: 0 });
            setError(null);
        });
        reader.readAsDataURL(file);
    };

    const resetPicker = () => {
        setImageSrc(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpload = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setIsUploading(true);
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!blob) throw new Error(t('avatar.crop_failed'));
            const res = await apiFetch('/api/user/avatar', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
                body: blob,
            });
            if (!res.ok) throw await apiErrorFrom(res);
            onBack();
        } catch (err: any) {
            setError(err.message || t('avatar.upload_failed'));
            setIsUploading(false);
        }
    };

    return (
        <YouPage>
            <BackHeader parentLabel={t('account.title')} onBack={onBack} title={t('account.page.avatar')} />

            <div className="mt-2 flex max-w-md flex-col gap-6">
                <ErrorNote>{error}</ErrorNote>

                {!imageSrc ? (
                    <div className="flex flex-col items-center gap-6 py-4">
                        <Avatar username={username} size={144} cacheKey={cacheBuster} />
                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                            {t('account.avatar.choose')}
                        </Button>
                        <Note className="text-center">{t('account.avatar.hint')}</Note>
                    </div>
                ) : (
                    <>
                        <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-[var(--c-plate-strong)]">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                showGrid={false}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="flex-none text-sm font-semibold text-[var(--c-muted)]">{t('avatar.zoom')}</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-label={t('avatar.zoom')}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="h-11 w-full cursor-pointer accent-[var(--c-accent)]"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={resetPicker}>
                                {t('btn.cancel')}
                            </Button>
                            <Button variant="primary" className="flex-1" onClick={handleUpload} disabled={isUploading}>
                                {isUploading && <BusySpinner />}
                                {isUploading ? t('avatar.uploading') : t('btn.save')}
                            </Button>
                        </div>
                    </>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png"
                    className="hidden"
                />
            </div>
        </YouPage>
    );
};

export default EditAvatar;
