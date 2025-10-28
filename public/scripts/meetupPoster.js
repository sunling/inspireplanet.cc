// 海报生成器：根据活动信息生成圆桌风格海报（Canvas）
// 使用站点主题色 var(--primary) 作为主色，并把二维码指向活动详情页

(function(global){
  function getPrimaryColor(){
    try {
      const styles = getComputedStyle(document.documentElement);
      const v = styles.getPropertyValue('--primary').trim();
      return v || '#FF7F50';
    } catch(_) {
      return '#FF7F50';
    }
  }

  function hexToRGBA(hex, alpha){
    const h = hex.replace('#','');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    const words = (text || '').split(/\s+/);
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    lines.forEach((l, i) => {
      ctx.fillText(l, x, y + i * lineHeight);
    });
    return y + lines.length * lineHeight;
  }

  function drawBulletList(ctx, items, x, y, maxWidth, lineHeight){
    let cy = y;
    (items || []).forEach(item => {
      // bullet
      ctx.beginPath();
      ctx.arc(x, cy - 6, 3, 0, Math.PI*2);
      ctx.fill();
      // text
      cy = wrapText(ctx, item, x + 12, cy, maxWidth - 12, lineHeight) + 4;
    });
    return cy;
  }

  function parseTopics(description){
    if (!description) return [];
    const raw = description
      .split(/\n|；|;|、|，|,/)
      .map(s => s.trim())
      .filter(Boolean);
    return raw.slice(0,6);
  }

  function formatDateStr(iso){
    try{
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${y}-${m}-${day} ${hh}:${mm}`;
    }catch(_){
      return iso || '';
    }
  }

  async function generateMeetupPoster(meetup, canvas, options = {}){
    const primary = getPrimaryColor();
    const accentLight = hexToRGBA(primary, 0.12);
    const accentBorder = hexToRGBA(primary, 0.35);

    const width = 1080;
    const height = 1620; // 2:3 比例，适合移动端
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#f7f7f2';
    ctx.fillRect(0,0,width,height);

    // 顶部标题（增大字号）
    ctx.fillStyle = '#222';
    ctx.font = 'bold 72px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.fillText('心灵圆桌', width/2, 130);
    ctx.font = '500 48px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('一场关于“我们”的对话', width/2, 190);

    // 三列小标题（稍增大）
    ctx.textAlign = 'left';
    ctx.font = 'bold 44px system-ui';
    ctx.fillStyle = primary;
    ctx.fillText('探讨主题', 80, 270);
    ctx.fillText('活动形式', 430, 270);
    ctx.fillText('会议流程', 780, 270);

    // 正文文本（增大字号）
    ctx.fillStyle = '#333';
    ctx.font = '32px system-ui';

    // 左列：探讨主题（来自描述拆分）
    const topics = parseTopics(meetup.description);
    drawBulletList(ctx, topics.length ? topics : ['自由讨论、共情倾听', '亲密关系/自我探索', '情绪表达与支持'], 80, 320, 280, 48);

    // 中列：活动形式（类型+人数/时长）
    const modeText = (meetup.type === 'online') ? '6人圆桌线上会议' : '6人圆桌线下会议';
    const durationText = meetup.duration ? `时长：${meetup.duration}小时` : '时长：1小时';
    wrapText(ctx, `${modeText}\n${durationText}`, 430, 320, 280, 48);

    // 右列：会议流程（固定）
    drawBulletList(ctx, ['每人轮流分享', '自由讨论/回应', '总结'], 780, 320, 260, 48);

    // 中间主视觉——用主题色画交流圆环与气泡
    ctx.strokeStyle = accentBorder;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(width/2, 820, 360, 0, Math.PI*2);
    ctx.stroke();
    ctx.fillStyle = accentLight;
    // 左气泡
    ctx.beginPath();
    ctx.arc(300, 820, 160, 0, Math.PI*2);
    ctx.fill();
    // 右气泡
    ctx.beginPath();
    ctx.arc(780, 820, 180, 0, Math.PI*2);
    ctx.fill();

    // 主题标题（增大字号）
    ctx.textAlign = 'center';
    ctx.fillStyle = primary;
    ctx.font = 'bold 58px system-ui';
    ctx.fillText('本期主题：', width/2, 760);
    ctx.font = 'bold 84px system-ui';
    ctx.fillText((meetup.title || '').slice(0,18), width/2, 840);

    // 底部两栏：主持人与活动信息（增大字号）
    ctx.textAlign = 'left';
    ctx.fillStyle = '#222';
    ctx.font = 'bold 40px system-ui';
    ctx.fillText('主持人介绍', 80, 1020);
    ctx.fillText('活动信息', 600, 1020);
    ctx.font = '32px system-ui';
    const organizer = meetup.organizer || '志愿主持';
    const contact = meetup.contact ? `联系：${meetup.contact}` : '';
    wrapText(ctx, `${organizer}\n心理学爱好者\n理性与感性平衡\n${contact}`.trim(), 80, 1070, 440, 48);

    const dateStr = formatDateStr(meetup.datetime);
    const placeStr = meetup.type === 'online' ? `参与方式：线上（${meetup.location || '腾讯会议/飞书'}）` : `参与方式：线下（${meetup.location || '待定'}）`;
    ctx.fillText(`活动时间：${dateStr}`, 600, 1070);
    ctx.fillText(placeStr, 600, 1120);
    ctx.fillText('扫码报名：', 600, 1160);

    // 生成二维码（指向活动详情页）
    const detailUrl = options.detailUrl || `${window.location.origin}/meetup-detail.html?id=${encodeURIComponent(meetup.id || meetup.meetup_id || '')}`;
    // 优先使用 node-qrcode 的 toCanvas，如无则兼容 qrcodejs 的构造器 API
    if (!options.skipQR && detailUrl && global.QRCode) {
      if (typeof global.QRCode.toCanvas === 'function') {
        const qrCanvas = document.createElement('canvas');
        await global.QRCode.toCanvas(qrCanvas, detailUrl, { width: 240, margin: 2 });
        // 下移二维码，避免与活动信息区重叠
        ctx.drawImage(qrCanvas, 780, 1200);
      } else {
        // qrcodejs 兼容：通过构造器在临时容器生成，再绘制到主画布
        const temp = document.createElement('div');
        temp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
        document.body.appendChild(temp);
        try {
          // qrcodejs 的 API：new QRCode(element, { text, width, height, correctLevel })
          const size = 240;
          const qr = new global.QRCode(temp, {
            text: detailUrl,
            width: size,
            height: size,
            correctLevel: global.QRCode.CorrectLevel && global.QRCode.CorrectLevel.H || 1
          });
          // 优先取 canvas，其次取 img
          let qrCanvas = temp.querySelector('canvas');
          const qrImg = temp.querySelector('img');
          if (qrCanvas) {
            ctx.drawImage(qrCanvas, 780, 1200);
          } else if (qrImg) {
            await new Promise((resolve, reject) => {
              if (qrImg.complete) return resolve();
              qrImg.onload = resolve;
              qrImg.onerror = reject;
            });
            // 将图片绘制到主画布
            ctx.drawImage(qrImg, 780, 1200, size, size);
          } else {
            // 兜底占位
            ctx.strokeStyle = '#999';
            ctx.strokeRect(780, 1200, 240, 240);
            ctx.font = '24px system-ui';
            ctx.fillStyle = '#666';
            ctx.fillText('QR生成失败', 790, 1330);
          }
        } catch(_) {
          // 兜底占位
          ctx.strokeStyle = '#999';
          ctx.strokeRect(780, 1200, 240, 240);
          ctx.font = '24px system-ui';
          ctx.fillStyle = '#666';
          ctx.fillText('QR生成失败', 790, 1330);
        } finally {
          document.body.removeChild(temp);
        }
      }
    } else {
      // 占位提示
      ctx.strokeStyle = '#999';
      ctx.strokeRect(780, 1200, 240, 240);
      ctx.font = '24px system-ui';
      ctx.fillStyle = '#666';
      const tip = options.skipQR ? '创建成功后生成二维码' : 'QR库缺失';
      ctx.fillText(tip, 790, 1330);
    }

    // 底部参与者要求（增大字号并整体下移）
    ctx.textAlign = 'left';
    ctx.fillStyle = primary;
    ctx.font = 'bold 40px system-ui';
    ctx.fillText('参与者要求', 80, 1480);
    ctx.fillStyle = '#333';
    ctx.font = '30px system-ui';
    drawBulletList(ctx, ['愿意分享，尊重他人隐私，保持积极倾听', '一期一会，愿我们都能被倾听、被理解'], 80, 1540, 960, 46);

    return canvas.toDataURL('image/png');
  }

  async function renderPoster(meetup, canvasId, downloadBtnId, options = {}){
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const dataUrl = await generateMeetupPoster(meetup, canvas, options);
    const btn = document.getElementById(downloadBtnId);
    if (btn) {
      btn.onclick = function(){
        const a = document.createElement('a');
        a.href = dataUrl;
        const safeTitle = (meetup.title || '活动海报').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
        a.download = `${safeTitle}.png`;
        a.click();
      };
    }
    return dataUrl;
  }

  // 导出接口
  global.MeetupPoster = {
    renderPoster,
    generateMeetupPoster
  };
})(window);