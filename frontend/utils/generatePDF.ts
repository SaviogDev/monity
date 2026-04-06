import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  transactionDate: string | number | Date;
  description?: string;
  category?: {
    name: string;
  };
  type: 'income' | 'expense';
  amount: number;
}

interface ReportData {
  month: number;
  year: number;
  userName?: string;
  summary: {
    income: number;
    expense: number;
    freeMargin: number;
  };
  transactions: Transaction[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function generateMonthlyPDF(data: ReportData) {
  // Cria um documento A4 em formato retrato
  const doc = new jsPDF('p', 'pt', 'a4');
  
  const monthName = format(new Date(data.year, data.month - 1), 'MMMM', { locale: ptBR });
  const title = `Fechamento - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${data.year}`;

  // 1. CABEÇALHO DO PDF
  doc.setFillColor(52, 152, 219); // Azul Monity
  doc.rect(0, 0, 600, 100, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('MONITY', 40, 50);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Inteligência Financeira', 40, 70);

  doc.setFontSize(14);
  doc.text(title, 400, 60, { align: 'right' });

  // 2. RESUMO DO MÊS (Caixas de Valor)
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Mês', 40, 140);

  // Box Entradas
  doc.setFillColor(234, 250, 241); // Fundo Verde
  doc.setDrawColor(46, 204, 113); // Borda Verde
  doc.roundedRect(40, 160, 150, 60, 5, 5, 'FD');
  doc.setTextColor(46, 204, 113);
  doc.setFontSize(10);
  doc.text('Total Recebido', 50, 180);
  doc.setFontSize(14);
  doc.text(formatCurrency(data.summary.income), 50, 205);

  // Box Saídas
  doc.setFillColor(253, 237, 236); // Fundo Vermelho
  doc.setDrawColor(231, 76, 60); // Borda Vermelha
  doc.roundedRect(210, 160, 150, 60, 5, 5, 'FD');
  doc.setTextColor(231, 76, 60);
  doc.setFontSize(10);
  doc.text('Total Gasto', 220, 180);
  doc.setFontSize(14);
  doc.text(formatCurrency(data.summary.expense), 220, 205);

  // Box Margem Livre (Resultado)
  const isPositive = data.summary.freeMargin >= 0;
  doc.setFillColor(isPositive ? 235 : 253, isPositive ? 245 : 237, isPositive ? 251 : 236); 
  doc.setDrawColor(isPositive ? 52 : 231, isPositive ? 152 : 76, isPositive ? 219 : 60);
  doc.roundedRect(380, 160, 175, 60, 5, 5, 'FD');
  doc.setTextColor(isPositive ? 41 : 231, isPositive ? 128 : 76, isPositive ? 185 : 60);
  doc.setFontSize(10);
  doc.text('Resultado (Margem Livre)', 390, 180);
  doc.setFontSize(14);
  doc.text(formatCurrency(data.summary.freeMargin), 390, 205);

  // 3. TABELA DE TRANSAÇÕES
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhamento de Transações', 40, 260);

  // Preparar os dados para a tabela
  const tableData = data.transactions.map(t => [
    format(new Date(t.transactionDate), 'dd/MM/yyyy'),
    t.description || t.category?.name || 'Sem descrição',
    t.category?.name || '-',
    t.type === 'income' ? '+' : '-',
    formatCurrency(t.amount)
  ]);

  autoTable(doc, {
    startY: 280,
    head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 100 },
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 90, halign: 'right' }
    },
    didParseCell: function(data) {
      // Pinta o valor de verde ou vermelho dependendo do tipo
      if (data.section === 'body' && data.column.index === 4 && Array.isArray(data.row.raw)) {
        const type = data.row.raw[3];
        if (type === '+') {
          data.cell.styles.textColor = [46, 204, 113]; // Verde
        } else {
          data.cell.styles.textColor = [231, 76, 60]; // Vermelho
        }
      }
    }
  });

  // Rodapé
  const pageCount = doc.internal.pages.length;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Gerado pelo Monity em ${format(new Date(), 'dd/MM/yyyy HH:mm')} - Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  // Salva o arquivo no PC/Celular do usuário
  doc.save(`Monity_Fechamento_${monthName}_${data.year}.pdf`);
}