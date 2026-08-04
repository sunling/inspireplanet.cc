import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';

import { CardItem } from '../../../netlify/types';
import { cardsApi } from '../../../netlify/config';
import { useGlobalSnackbar } from '@/context/app';
import { getUserId } from '@/utils/user';
import { gradientOptions } from '@/constants/gradient';
import EditForm, { EditFormRef } from '../components/EditForm';
import { getUserName } from '../../../utils';
import { isMobileBrowser, saveImageDataUrl } from '@/utils/share';

const CreateCard: React.FC = () => {
  const navigate = useNavigate();
  const showSnackbar = useGlobalSnackbar();
  const editFormRef = useRef<EditFormRef>(null);

  // 初始卡片数据
  const getInitialCardData = (): CardItem => {
    const randomIndex = Math.floor(Math.random() * gradientOptions.length);
    const randomGradient = gradientOptions[randomIndex];

    let creator = getUserName() || '';

    return {
      id: '',
      created: new Date().toISOString(),
      title: '',
      quote: '',
      detail: '',
      creator,
      font: 'Noto Sans SC',
      gradient_class: randomGradient.class,
      image_path: '',
      is_private: false,
    };
  };

  const [initialCardData, setInitialCardData] =
    useState<CardItem>(getInitialCardData());

  // 处理表单提交
  const handleSubmit = async (
    cardData: CardItem,
    imageData?: { customImage?: string; selectedSearchImage?: string }
  ) => {
    const cardToSubmit = {
      ...cardData,
      created: new Date().toISOString(),
      upload: imageData?.customImage,
      image_path: imageData?.selectedSearchImage,
      user_id: getUserId(),
    };

    // 调用API提交卡片
    const response = await cardsApi.create(cardToSubmit);

    if (response.success) {
      showSnackbar.success(
        cardToSubmit.is_private ? '私密卡片已保存！' : '卡片提交成功！'
      );
      // 重置表单
      setInitialCardData(getInitialCardData());
      setTimeout(
        () => navigate(cardToSubmit.is_private ? '/my-cards' : '/cards'),
        1000
      );
    } else {
      throw new Error(response.error || '提交失败');
    }
  };

  // 下载卡片图片
  const handleDownload = async () => {
    const previewElement = editFormRef.current?.getPreviewElement();
    if (!previewElement) return;

    // 找到预览中的卡片元素
    const cardElement = previewElement.querySelector('.card');
    if (!cardElement) {
      throw new Error('未找到卡片元素');
    }

    // 配置html2canvas选项
    const canvas = await html2canvas(cardElement as HTMLElement, {
      scale: 2, // 提高清晰度
      useCORS: true,
      allowTaint: true,
      logging: false,
    });

    const fileName = `inspire-card-${Date.now()}.png`;
    saveImageDataUrl(canvas.toDataURL('image/png'), fileName);
    showSnackbar.success(
      isMobileBrowser() ? '图片已生成，请长按保存到相册' : '卡片下载成功'
    );
  };

  return (
    <EditForm
      ref={editFormRef}
      initialCardData={initialCardData}
      submitButtonText="提交到展示区"
      pageTitle="✨ 记录你的灵感"
      pageDescription="创建一张灵感卡片，记录触动你的观点和启发"
      showBackButton={false}
      showDownloadButton={true}
      onSubmit={handleSubmit}
      onDownload={handleDownload}
    />
  );
};

export default CreateCard;
