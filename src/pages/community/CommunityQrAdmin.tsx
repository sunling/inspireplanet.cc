import React, { ChangeEvent, useEffect, useState } from 'react';
import communityQrApi, {
  type CommunityQrGroup,
} from '../../netlify/services/communityQr';
import styles from './communityQr.module.css';

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const CommunityQrAdmin: React.FC = () => {
  const [group, setGroup] = useState<CommunityQrGroup>('community');
  return (
    <div className={styles.page}>
      <main className={`${styles.card} ${styles.adminCard}`}>
        <span className={styles.eyebrow}>启发星球 · 管理后台</span>
        <h1>更新入群二维码</h1>
        <label className={styles.groupSelector}>
          选择要更新的群
          <select
            value={group}
            onChange={(event) =>
              setGroup(event.target.value as CommunityQrGroup)
            }
          >
            <option value="community">启发星球社群</option>
            <option value="speakers">分享者群</option>
          </select>
        </label>
        <QrEditor key={group} group={group} />
      </main>
    </div>
  );
};

const QrEditor: React.FC<{ group: CommunityQrGroup }> = ({ group }) => {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const groupLabel = group === 'speakers' ? '分享者群' : '启发星球社群';
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    communityQrApi
      .current(group)
      .then((response) => {
        if (!response.success)
          throw new Error(response.error || '读取二维码失败');
        if (!active) return;
        setCurrentUrl(response.data?.imageUrl || null);
        setUpdatedAt(response.data?.updatedAt || null);
      })
      .catch(() => {
        if (active) setError('当前二维码读取失败，请刷新后重试。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [group]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setMessage('');
    setError('');
    setBase64Image('');
    setPreviewUrl(null);

    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('请选择 PNG、JPG 或 WebP 图片。');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('图片大小不能超过 3MB。');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setBase64Image(result);
      setPreviewUrl(result);
    };
    reader.onerror = () => setError('图片读取失败，请重新选择。');
    reader.readAsDataURL(file);
  };

  const handleUpdate = async () => {
    if (!base64Image || saving) return;
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await communityQrApi.update(base64Image, group);
      if (!response.success || !response.data?.imageUrl) {
        throw new Error(response.error || '更新失败');
      }
      setCurrentUrl(response.data.imageUrl);
      setUpdatedAt(response.data.updatedAt);
      setPreviewUrl(null);
      setBase64Image('');
      setMessage(
        `${groupLabel}二维码已更新。${response.data.cleanupComplete === false ? '旧图片清理未完成，请联系管理员检查。' : '上一张二维码已替换。'}`
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : '更新失败'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <p className={styles.intro}>
        {group === 'speakers'
          ? '分享申请成功后会展示这里的最新分享者群二维码，方便联系和交流。请每周检查并更新。'
          : '社群入群页面会展示这里的最新二维码。'}
        更新只会替换所选群的二维码。
      </p>
      {updatedAt && (
        <p className={styles.help}>
          上次更新：{new Date(updatedAt).toLocaleString('zh-CN')}
        </p>
      )}

      <div className={styles.adminGrid}>
        <section>
          <h2>当前二维码</h2>
          <div className={styles.previewBox}>
            {loading ? (
              <p className={styles.status}>正在加载…</p>
            ) : currentUrl ? (
              <img src={currentUrl} alt={`当前${groupLabel}二维码`} />
            ) : (
              <p className={styles.status}>尚未上传二维码</p>
            )}
          </div>
        </section>
        <section>
          <h2>新二维码预览</h2>
          <div className={styles.previewBox}>
            {previewUrl ? (
              <img src={previewUrl} alt={`新${groupLabel}二维码预览`} />
            ) : (
              <p className={styles.status}>选择图片后在这里预览</p>
            )}
          </div>
        </section>
      </div>

      <div className={styles.controls}>
        <label className={styles.fileButton}>
          选择二维码图片
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFile}
          />
        </label>
        <button
          className={styles.updateButton}
          type="button"
          disabled={!base64Image || saving || loading}
          onClick={handleUpdate}
        >
          {saving ? '正在更新…' : '确认更新'}
        </button>
      </div>
      <small className={styles.help}>
        支持 PNG、JPG、WebP，文件不超过 3MB。
      </small>
      {message && <p className={styles.success}>{message}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
};

export default CommunityQrAdmin;
