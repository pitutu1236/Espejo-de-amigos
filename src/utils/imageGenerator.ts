import { ADJECTIVES } from '../data/adjectives';
import { ScoreRecord } from '../types';

export interface ImageGenerationOptions {
  targetPerson: string;
  evaluator: string;
  scores: ScoreRecord;
  isSelf: boolean;
  dateStr?: string;
  isAnonymous?: boolean;
}

export function generateEvaluationImage(options: ImageGenerationOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const width = 1200;
      const height = 1750;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }

      // --- 1. Background (Warm editorial paper tone) ---
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#FAFAF8');
      bgGrad.addColorStop(1, '#F3EFEA');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle double border
      ctx.strokeStyle = '#E2DCD5';
      ctx.lineWidth = 4;
      ctx.strokeRect(28, 28, width - 56, height - 56);

      ctx.strokeStyle = '#D1C7BD';
      ctx.lineWidth = 1;
      ctx.strokeRect(36, 36, width - 72, height - 72);

      // Corner vintage accents
      const cornerSize = 16;
      ctx.fillStyle = '#8C7B6D';
      [[42, 42], [width - 42 - cornerSize, 42], [42, height - 42 - cornerSize], [width - 42 - cornerSize, height - 42 - cornerSize]].forEach(([x, y]) => {
        ctx.fillRect(x, y, cornerSize, 2);
        ctx.fillRect(x, y, 2, cornerSize);
      });

      // --- 2. Header Section ---
      ctx.textAlign = 'center';

      // Anonymous Badge if applicable
      if (options.isAnonymous) {
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.roundRect(width / 2 - 160, 52, 320, 26, 13);
        ctx.fill();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.letterSpacing = '1.5px';
        ctx.fillText('🔒 VALORACIÓN 100% ANÓNIMA', width / 2, 69);
      }
      
      // Small decorative label
      ctx.fillStyle = '#8C7B6D';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('TEST DE PERSONALIDAD · VALORACIÓN SINCERA', width / 2, options.isAnonymous ? 100 : 88);

      // Main Title
      ctx.fillStyle = '#1C1917';
      ctx.font = '800 36px -apple-system, BlinkMacSystemFont, "Space Grotesk", sans-serif';
      ctx.letterSpacing = '0px';
      ctx.fillText('EL ESPEJO DE AMIGOS', width / 2, options.isAnonymous ? 138 : 130);

      // Divider line with diamond center
      const divY = options.isAnonymous ? 154 : 150;
      ctx.strokeStyle = '#D1C7BD';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 220, divY);
      ctx.lineTo(width / 2 + 220, divY);
      ctx.stroke();

      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.arc(width / 2, divY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Participants Box
      const boxY = 170;
      const boxHeight = 70;
      const boxWidth = width - 120;
      const boxX = 60;

      ctx.fillStyle = options.isAnonymous ? '#FAFAFA' : '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
      ctx.fill();
      ctx.strokeStyle = options.isAnonymous ? '#CBD5E1' : '#E7E2DB';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inside participants box
      const dateText = options.dateStr || new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

      if (options.isAnonymous) {
        // Left: Recipient
        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748B';
        ctx.font = '700 12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.letterSpacing = '0.5px';
        ctx.fillText('VALORACIÓN DIRIGIDA A:', boxX + 24, boxY + 28);
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.letterSpacing = '0px';
        ctx.fillText(options.targetPerson.toUpperCase() || 'AMIGO/A', boxX + 24, boxY + 54);

        // Center: Anonymous sender
        ctx.fillStyle = '#64748B';
        ctx.font = '700 12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.letterSpacing = '0.5px';
        ctx.fillText('ENVIADO POR:', boxX + 440, boxY + 28);
        ctx.fillStyle = '#B45309';
        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.letterSpacing = '0px';
        ctx.fillText('🕵️ AMIGO ANÓNIMO (SECRETO)', boxX + 440, boxY + 53);

        // Right: Date
        ctx.textAlign = 'right';
        ctx.fillStyle = '#64748B';
        ctx.font = '700 12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('FECHA:', boxX + boxWidth - 24, boxY + 28);
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(dateText, boxX + boxWidth - 24, boxY + 53);
      } else {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#78716C';
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('NOMBRE DEL AMIGO EVALUADO:', boxX + 24, boxY + 28);
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(options.targetPerson.toUpperCase() || 'AMIGO', boxX + 24, boxY + 54);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#78716C';
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('FECHA DE VALORACIÓN:', boxX + boxWidth - 24, boxY + 28);
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(dateText, boxX + boxWidth - 24, boxY + 53);
      }

      // --- 3. The 3 Columns of 50 Adjectives ---
      const colWidth = 345;
      const colGap = 20;
      const startX = 60;
      const startY = 270;
      const rowHeight = 44;

      const col1 = ADJECTIVES.filter(a => a.column === 1); // 17 items
      const col2 = ADJECTIVES.filter(a => a.column === 2); // 18 items
      const col3 = ADJECTIVES.filter(a => a.column === 3); // 15 items

      const columns = [col1, col2, col3];

      columns.forEach((colItems, colIndex) => {
        const cX = startX + colIndex * (colWidth + colGap);

        // Column background container
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.roundRect(cX, startY, colWidth, 18 * rowHeight + 16, 12);
        ctx.fill();
        ctx.strokeStyle = '#E8E3DD';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Render each adjective row
        colItems.forEach((adj, rIndex) => {
          const rY = startY + 10 + rIndex * rowHeight;
          const rawScore = options.scores[adj.id] ?? (options.scores as any)[String(adj.id)];
          const score = typeof rawScore === 'number' ? rawScore : (Number(rawScore) || 5);

          // Alternate row subtle zebra
          if (rIndex % 2 === 1) {
            ctx.fillStyle = 'rgba(245, 243, 239, 0.6)';
            ctx.beginPath();
            ctx.roundRect(cX + 6, rY, colWidth - 12, rowHeight - 4, 6);
            ctx.fill();
          }

          // Adjective name
          ctx.textAlign = 'left';
          ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#292524';
          ctx.fillText(adj.word, cX + 16, rY + 25);

          // Score Badge
          const badgeWidth = 42;
          const badgeHeight = 28;
          const badgeX = cX + colWidth - badgeWidth - 12;
          const badgeY = rY + 6;

          // Color palette based on score
          let badgeBg = '#E0E7FF';
          let badgeText = '#3730A3';
          let gaugeColor = '#4F46E5';

          if (score >= 9) {
            badgeBg = '#DCFCE7';
            badgeText = '#15803D';
            gaugeColor = '#16A34A';
          } else if (score >= 7) {
            badgeBg = '#E0F2FE';
            badgeText = '#0369A1';
            gaugeColor = '#0284C7';
          } else if (score >= 5) {
            badgeBg = '#FEF3C7';
            badgeText = '#B45309';
            gaugeColor = '#D97706';
          } else {
            badgeBg = '#FFE4E6';
            badgeText = '#BE123C';
            gaugeColor = '#E11D48';
          }

          ctx.fillStyle = badgeBg;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
          ctx.fill();

          ctx.textAlign = 'center';
          ctx.fillStyle = badgeText;
          ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillText(score.toString(), badgeX + badgeWidth / 2, badgeY + 19);

          // Miniature score bar gauge
          const gaugeW = 60;
          const gaugeX = badgeX - gaugeW - 10;
          const gaugeY = rY + 18;
          ctx.fillStyle = '#E5E0DA';
          ctx.beginPath();
          ctx.roundRect(gaugeX, gaugeY, gaugeW, 5, 2.5);
          ctx.fill();

          const fillW = Math.max(4, (score / 10) * gaugeW);
          ctx.fillStyle = gaugeColor;
          ctx.beginPath();
          ctx.roundRect(gaugeX, gaugeY, fillW, 5, 2.5);
          ctx.fill();
        });
      });

      // --- 4. Bottom Summary & Highlights Card ---
      const summaryY = 1110;
      const summaryHeight = 540;
      const summaryW = width - 120;
      const summaryX = 60;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(summaryX, summaryY, summaryW, summaryHeight, 14);
      ctx.fill();
      ctx.strokeStyle = '#DED6CB';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Calculate Top Traits
      const ratedList = ADJECTIVES.map(adj => {
        const rawScore = options.scores[adj.id] ?? (options.scores as any)[String(adj.id)];
        return {
          ...adj,
          score: typeof rawScore === 'number' ? rawScore : (Number(rawScore) || 5),
        };
      });

      // Top 5 highest traits
      const topTraits = [...ratedList]
        .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
        .slice(0, 5);

      // Areas of growth / lowest traits
      const growthTraits = [...ratedList]
        .sort((a, b) => a.score - b.score || a.word.localeCompare(b.word))
        .slice(0, 4);

      // Average score
      const totalScore = ratedList.reduce((acc, curr) => acc + curr.score, 0);
      const avgScore = (totalScore / ratedList.length).toFixed(1);

      // Header of Summary
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1C1917';
      ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Space Grotesk", sans-serif';
      ctx.fillText('ANÁLISIS Y REFLEXIÓN DEL TEST', summaryX + 28, summaryY + 44);

      ctx.fillStyle = '#78716C';
      ctx.font = '500 14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Síntesis de cómo te ve tu amigo para tu desarrollo personal', summaryX + 28, summaryY + 68);

      // Average Score Pill
      ctx.fillStyle = '#F5F5F4';
      ctx.beginPath();
      ctx.roundRect(summaryX + summaryW - 170, summaryY + 22, 142, 54, 10);
      ctx.fill();
      ctx.strokeStyle = '#E7E5E4';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#78716C';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('MEDIA GLOBAL', summaryX + summaryW - 99, summaryY + 41);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`${avgScore} / 10`, summaryX + summaryW - 99, summaryY + 66);

      // Left Box: Top 5 Strengths
      const subBoxW = (summaryW - 80) / 2;
      const subBoxY = summaryY + 95;

      ctx.fillStyle = '#F0FDF4';
      ctx.beginPath();
      ctx.roundRect(summaryX + 28, subBoxY, subBoxW, 230, 10);
      ctx.fill();
      ctx.strokeStyle = '#BBF7D0';
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#166534';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('★ MAYORES VIRTUDES (TOP 5)', summaryX + 44, subBoxY + 30);

      topTraits.forEach((trait, i) => {
        const itemY = subBoxY + 62 + i * 33;
        ctx.fillStyle = '#14532D';
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`${i + 1}. ${trait.word}`, summaryX + 44, itemY);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#16A34A';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`${trait.score} pts`, summaryX + 28 + subBoxW - 16, itemY);
        ctx.textAlign = 'left';
      });

      // Right Box: Areas to cultivate / Lowest
      const rightBoxX = summaryX + 28 + subBoxW + 24;
      ctx.fillStyle = '#FFF7ED';
      ctx.beginPath();
      ctx.roundRect(rightBoxX, subBoxY, subBoxW, 230, 10);
      ctx.fill();
      ctx.strokeStyle = '#FED7AA';
      ctx.stroke();

      ctx.fillStyle = '#9A3412';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('⚡ RASGOS DE REFLEXIÓN / APRENDIZAJE', rightBoxX + 16, subBoxY + 30);

      growthTraits.forEach((trait, i) => {
        const itemY = subBoxY + 62 + i * 33;
        ctx.fillStyle = '#7C2D12';
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`${i + 1}. ${trait.word}`, rightBoxX + 16, itemY);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#EA580C';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`${trait.score} pts`, rightBoxX + subBoxW - 16, itemY);
        ctx.textAlign = 'left';
      });

      // Philosophical Purpose Banner
      const noteY = subBoxY + 250;
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(summaryX + 28, noteY, summaryW - 56, 120, 10);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(options.isAnonymous ? 'PROPÓSITO DE ESTA VALORACIÓN ANÓNIMA:' : 'PROPÓSITO DEL JUEGO:', summaryX + 48, noteY + 32);

      ctx.font = '400 13px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#475569';
      let textLine1 = 'Este resultado es un espejo sincero. Permite descubrir cómo eres percibido realmente por un amigo,';
      let textLine2 = 'identificar tus puntos ciegos, calibrar tus fortalezas y saber con exactitud qué virtudes destacar';
      let textLine3 = 'o qué actitudes conviene moderar para mejorar tu personalidad y relaciones.';

      if (options.isAnonymous) {
        textLine1 = 'Esta valoración se ha completado de forma 100% anónima para que la sinceridad sea pura y libre de filtros.';
        textLine2 = 'Un amigo cercano ha querido regalarte esta mirada honesta para que conozcas tus puntos fuertes reales';
        textLine3 = 'y los aspectos que puedes cultivar para potenciar tu personalidad y tu crecimiento personal.';
      }

      ctx.fillText(textLine1, summaryX + 48, noteY + 58);
      ctx.fillText(textLine2, summaryX + 48, noteY + 80);
      ctx.fillText(textLine3, summaryX + 48, noteY + 102);

      // Footer signature
      ctx.textAlign = 'center';
      ctx.fillStyle = '#A8A29E';
      ctx.font = '500 12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Espejo de Amigos · Juego de Autoconocimiento y Percepción Interpersonal', width / 2, summaryY + summaryHeight - 16);

      // Return data URL
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      resolve(dataUrl);
    } catch (err) {
      reject(err);
    }
  });
}

export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
