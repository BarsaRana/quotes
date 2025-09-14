import jsPDF from "jspdf";

export interface PdfItem {
  name: string;
  qty: number;
  unit_cost: number;
  line_total: number;
}

export function downloadQuotePdf(
  quoteData: {
    client: string;
    region: string;
    totalAmount: number;
    items: PdfItem[];
  }
): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text("Quote Summary", 20, 20);
  
  // Client info
  doc.setFontSize(12);
  doc.text(`Client: ${quoteData.client}`, 20, 40);
  doc.text(`Region: ${quoteData.region}`, 20, 50);
  
  // Items table
  let yPos = 70;
  doc.text("Items:", 20, yPos);
  yPos += 10;
  
  quoteData.items.forEach((item, index) => {
    doc.text(`${index + 1}. ${item.name} - Qty: ${item.qty} - Unit: $${item.unit_cost.toFixed(2)} - Total: $${item.line_total.toFixed(2)}`, 25, yPos);
    yPos += 8;
  });
  
  // Total
  yPos += 10;
  doc.setFontSize(14);
  doc.text(`Total Amount: $${quoteData.totalAmount.toFixed(2)}`, 20, yPos);
  
  // Download
  doc.save(`quote-${Date.now()}.pdf`);
}