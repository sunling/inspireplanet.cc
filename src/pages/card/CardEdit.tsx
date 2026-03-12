import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { CardItem } from '../../netlify/types';
import { cardsApi } from '../../netlify/config';
import { useGlobalSnackbar } from '@/context/app';
import EditForm from './components/EditForm';

const CardEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showSnackbar = useGlobalSnackbar();

  // 表单状态
  const [cardData, setCardData] = useState<CardItem>({
    id: id || '',
    title: '',
    quote: '',
    detail: '',
    creator: '',
    gradient_class: 'card-gradient-1',
    font: 'Noto Sans SC',
    image_path: '',
    created: new Date().toISOString(),
  });

  // UI状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 获取卡片数据
  useEffect(() => {
    const fetchCardData = async () => {
      try {
        if (!id) {
          setError('卡片ID不存在');
          setLoading(false);
          return;
        }

        setLoading(true);
        const response = await cardsApi.getById(id);

        if (!response.success) {
          showSnackbar.error('获取卡片失败');
          setError('获取卡片失败');
          return;
        }

        const data = response.data?.records[0];
        console.log('获取卡片详情:', data);

        if (data && typeof data === 'object') {
          setCardData(data);
          setError('');
        } else {
          setError('获取卡片数据格式错误');
        }
      } catch (err) {
        setError('获取卡片数据失败，请稍后重试');
        console.error('获取卡片数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCardData();
  }, [id]);

  // 处理表单提交
  const handleSubmit = async (data: CardItem) => {
    try {
      const response = await cardsApi.update(data);

      if (!response.success) {
        showSnackbar.error(response.error || '更新失败');
        return;
      }

      console.log('修改卡片的返回:', response);
      showSnackbar.success('卡片已更新');
      setTimeout(() => navigate(`/card-detail?id=${data.id}`), 1000);
    } catch (err) {
      showSnackbar.error('保存卡片失败，请稍后重试');
      console.error('保存卡片失败:', err);
    }
  };

  // 处理返回
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <EditForm
      initialCardData={cardData}
      submitButtonText="保存修改"
      pageTitle="✏️ 雕琢你的灵感"
      showBackButton={true}
      isLoading={loading}
      error={error}
      onSubmit={handleSubmit}
      onBack={handleBack}
    />
  );
};

export default CardEdit;
